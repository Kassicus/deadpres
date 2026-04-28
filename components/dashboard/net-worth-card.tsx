"use client";

import * as React from "react";
import { TrendingUp, ArrowUpRight, ArrowDownRight } from "lucide-react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card } from "@/components/ui/card";
import { useFinance } from "@/lib/store";
import { cashflow, monthlyRecurringNet, netWorth, projectGrowth, transactionsInRange } from "@/lib/finance";
import { formatCurrency, formatDate, formatPercent } from "@/lib/format";
import type { Account, Transaction } from "@/lib/types";

const FORECAST_MONTHS = 12;
const HISTORY_MONTHS = 6;
const CASHFLOW_LOOKBACK_MONTHS = 3;

interface ChartPoint {
  date: string;
  monthIndex: number; // months relative to now (negative = past, 0 = now, positive = forecast)
  history?: number;
  forecast?: number;
}

export function NetWorthCard() {
  const accounts = useFinance((s) => s.accounts);
  const transactions = useFinance((s) => s.transactions);
  const recurringPayments = useFinance((s) => s.recurringPayments);

  const { assets, liabilities, total } = netWorth(accounts);

  const trend = React.useMemo(
    () => buildTrailingNetWorth(accounts, transactions, HISTORY_MONTHS),
    [accounts, transactions],
  );

  const scheduledNet = React.useMemo(() => monthlyRecurringNet(recurringPayments), [recurringPayments]);
  const cashflowNet = React.useMemo(
    () => averageMonthlyNet(transactions, CASHFLOW_LOOKBACK_MONTHS),
    [transactions],
  );

  const avgMonthlyNet = scheduledNet !== 0 ? scheduledNet : cashflowNet;
  const forecastSource = scheduledNet !== 0 ? "scheduled" : "cashflow avg";

  const weightedRate = React.useMemo(() => weightedAssetApr(accounts), [accounts]);
  const showForecast = avgMonthlyNet !== 0 || weightedRate > 0;

  const forward = React.useMemo(() => {
    if (!showForecast) return [];
    return projectGrowth({
      startingBalance: total,
      monthlyContribution: avgMonthlyNet,
      annualRatePercent: weightedRate,
      months: FORECAST_MONTHS,
    });
  }, [showForecast, total, avgMonthlyNet, weightedRate]);

  // Build a single dataset where every point owns either `history`, `forecast`, or both
  // (the "now" point gets both so the two lines visually connect).
  const data: ChartPoint[] = React.useMemo(() => {
    const points: ChartPoint[] = [];
    trend.forEach((p, i) => {
      points.push({
        date: p.date,
        monthIndex: i - (trend.length - 1), // last entry in trend is "today" → 0
        history: p.value,
        // Stitch the lines together at "today" so the visual line is continuous.
        forecast: i === trend.length - 1 ? p.value : undefined,
      });
    });
    forward.slice(1).forEach((p, i) => {
      points.push({
        date: p.date,
        monthIndex: i + 1,
        forecast: p.balance,
      });
    });
    return points;
  }, [trend, forward]);

  const first = trend[0]?.value ?? 0;
  const change = total - first;
  const pct = first !== 0 ? change / Math.abs(first) : 0;
  const positive = change >= 0;

  return (
    <Card className="overflow-hidden relative">
      <div className="absolute inset-0 gradient-mesh opacity-50 pointer-events-none" />
      <div className="relative p-6 grid gap-6 lg:grid-cols-[1fr_auto]">
        <div>
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Net Worth</div>
          <div className="mt-1 flex items-baseline gap-3">
            <div className="text-4xl lg:text-5xl font-semibold tracking-tight num">{formatCurrency(total)}</div>
            {first !== 0 && (
              <div
                className={`flex items-center gap-1 text-sm font-medium ${positive ? "text-success" : "text-destructive"}`}
              >
                {positive ? <ArrowUpRight className="size-4" /> : <ArrowDownRight className="size-4" />}
                <span className="num">{formatCurrency(Math.abs(change))}</span>
                <span className="text-muted-foreground font-normal">({formatPercent(Math.abs(pct))})</span>
              </div>
            )}
          </div>
          <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
            <span>
              Assets <span className="text-foreground font-medium num">{formatCurrency(assets)}</span>
            </span>
            <span>
              Liabilities <span className="text-foreground font-medium num">{formatCurrency(liabilities)}</span>
            </span>
          </div>
        </div>
        {showForecast && (
          <div className="flex flex-wrap items-center gap-2 self-start">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground rounded-lg bg-card/60 backdrop-blur border border-border/60 px-2.5 py-1.5">
              <TrendingUp className="size-3.5 text-primary" />
              {HISTORY_MONTHS}mo back · {FORECAST_MONTHS}mo forecast
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground rounded-lg bg-card/60 backdrop-blur border border-border/60 px-2.5 py-1.5">
              <span className="text-foreground font-medium num">
                {formatCurrency(avgMonthlyNet, { signed: true, compact: true })}/mo
              </span>
              <span>({forecastSource})</span>
              {weightedRate > 0 && <span>· {weightedRate.toFixed(1)}% APR</span>}
            </div>
          </div>
        )}
      </div>

      <div className="px-2 pb-2">
        <ResponsiveContainer width="100%" height={200}>
          <ComposedChart data={data} margin={{ top: 10, right: 16, left: 8, bottom: 22 }}>
            <defs>
              <linearGradient id="nw-history" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.45} />
                <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="nw-forecast" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.18} />
                <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
              </linearGradient>
            </defs>

            <CartesianGrid stroke="var(--border)" strokeOpacity={0.4} vertical={false} />

            <XAxis
              dataKey="monthIndex"
              type="number"
              domain={["dataMin", "dataMax"]}
              ticks={tickIndices(HISTORY_MONTHS, showForecast ? FORECAST_MONTHS : 0)}
              tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(m: number) => formatMonthOffset(m)}
              interval={0}
              padding={{ left: 4, right: 4 }}
            />

            {/* YAxis kept hidden but registered so the tooltip and grid know the scale. */}
            <YAxis hide domain={["dataMin - 100", "dataMax + 100"]} />

            <ReferenceLine
              x={0}
              stroke="var(--foreground)"
              strokeOpacity={0.35}
              strokeDasharray="4 4"
              label={{
                value: "Today",
                position: "top",
                fill: "var(--muted-foreground)",
                fontSize: 10,
              }}
            />

            <Tooltip
              cursor={{ stroke: "var(--foreground)", strokeOpacity: 0.2, strokeWidth: 1 }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const point = payload[0].payload as ChartPoint;
                const value = point.history ?? point.forecast ?? 0;
                const isForecast = point.history === undefined;
                const isToday = point.monthIndex === 0;
                return (
                  <div className="rounded-lg border border-border/70 bg-popover px-3 py-2 text-xs shadow-xl">
                    <div className="font-medium text-popover-foreground">
                      {formatDate(point.date, "month")}
                    </div>
                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground mt-0.5">
                      {isToday ? "Today" : isForecast ? "Projected" : "Historical"}
                      {!isToday && (
                        <span className="ml-1 normal-case tracking-normal text-foreground">
                          · {formatMonthOffset(point.monthIndex, true)}
                        </span>
                      )}
                    </div>
                    <div className="mt-1 num font-semibold tabular-nums">
                      {formatCurrency(value)}
                    </div>
                  </div>
                );
              }}
            />

            <Area
              type="monotone"
              dataKey="history"
              stroke="var(--primary)"
              strokeWidth={2.5}
              fill="url(#nw-history)"
              connectNulls={false}
              isAnimationActive={false}
            />
            <Area
              type="monotone"
              dataKey="forecast"
              stroke="var(--primary)"
              strokeOpacity={0.85}
              strokeWidth={2}
              strokeDasharray="5 5"
              fill="url(#nw-forecast)"
              connectNulls={false}
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

/** Build sparse tick positions: history endpoints, today, and a few forecast markers. */
function tickIndices(historyMonths: number, forecastMonths: number): number[] {
  const ticks: number[] = [];
  if (historyMonths > 0) {
    ticks.push(-historyMonths);
    if (historyMonths >= 6) ticks.push(-Math.round(historyMonths / 2));
  }
  ticks.push(0);
  if (forecastMonths > 0) {
    if (forecastMonths >= 4) ticks.push(Math.round(forecastMonths / 4));
    if (forecastMonths >= 6) ticks.push(Math.round(forecastMonths / 2));
    if (forecastMonths >= 9) ticks.push(Math.round((forecastMonths * 3) / 4));
    ticks.push(forecastMonths);
  }
  return ticks;
}

/** Render a month-offset value as a friendly label like "Now", "−3m", or "+6m". */
function formatMonthOffset(m: number, verbose = false): string {
  if (m === 0) return verbose ? "Now" : "Now";
  const abs = Math.abs(m);
  const unit = verbose ? (abs === 1 ? "month" : "months") : "m";
  const dir = m < 0 ? (verbose ? " ago" : "") : verbose ? " from now" : "";
  const sign = !verbose ? (m < 0 ? "−" : "+") : "";
  const space = verbose ? " " : "";
  return `${sign}${abs}${space}${unit}${dir}`;
}

function buildTrailingNetWorth(
  accounts: Account[],
  txs: Transaction[],
  monthsBack: number,
): { date: string; value: number }[] {
  const today = new Date();
  let balance = netWorth(accounts).total;
  const points: { date: string; value: number }[] = [{ date: today.toISOString(), value: balance }];

  const sorted = [...txs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  let cursor = new Date(today.getFullYear(), today.getMonth(), 1);

  for (let i = 0; i < monthsBack; i++) {
    const monthStart = new Date(cursor);
    cursor = new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1);

    const monthTxs = sorted.filter((t) => {
      const td = new Date(t.date);
      return td >= cursor && td < monthStart;
    });

    let monthNet = 0;
    for (const t of monthTxs) {
      if (t.type === "income") monthNet += t.amount;
      else if (t.type === "expense") monthNet -= t.amount;
    }
    balance -= monthNet;
    points.unshift({ date: cursor.toISOString(), value: balance });
  }

  return points;
}

function averageMonthlyNet(txs: Transaction[], monthsBack: number): number {
  if (txs.length === 0 || monthsBack <= 0) return 0;
  const today = new Date();
  let totalNet = 0;
  let counted = 0;

  for (let i = 0; i < monthsBack; i++) {
    const start = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const end = new Date(today.getFullYear(), today.getMonth() - i + 1, 0, 23, 59, 59, 999);
    const monthTxs = transactionsInRange(txs, start, end);
    if (monthTxs.length === 0) continue;
    totalNet += cashflow(monthTxs).net;
    counted++;
  }

  return counted > 0 ? totalNet / counted : 0;
}

function weightedAssetApr(accounts: Account[]): number {
  let weightedSum = 0;
  let weight = 0;
  for (const a of accounts) {
    if (a.archived) continue;
    if (a.type === "credit" || a.type === "loan") continue;
    if (!a.apr || a.apr <= 0 || a.balance <= 0) continue;
    weightedSum += a.apr * a.balance;
    weight += a.balance;
  }
  return weight > 0 ? weightedSum / weight : 0;
}
