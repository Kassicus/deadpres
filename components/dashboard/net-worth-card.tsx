"use client";

import * as React from "react";
import { TrendingUp, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useFinance } from "@/lib/store";
import { cashflow, monthlyRecurringNet, netWorth, projectGrowth, transactionsInRange } from "@/lib/finance";
import { formatCurrency, formatPercent } from "@/lib/format";
import { AreaChart } from "@/components/charts/area-chart";
import type { Account, Transaction } from "@/lib/types";

const FORECAST_MONTHS = 12;
const HISTORY_MONTHS = 6;
const CASHFLOW_LOOKBACK_MONTHS = 3;

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

  // Prefer scheduled income/expense — it's exact. Fall back to cashflow average.
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

  const data = [
    ...trend.map((p) => ({ date: p.date, value: p.value })),
    ...forward.slice(1).map((p) => ({ date: p.date, value: p.balance })),
  ];

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
          <div className="flex items-center gap-2 self-start">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground rounded-lg bg-card/60 backdrop-blur border border-border/60 px-2.5 py-1.5">
              <TrendingUp className="size-3.5 text-primary" />
              {FORECAST_MONTHS}-mo forecast
              <span className="text-foreground font-medium num ml-1">
                {formatCurrency(avgMonthlyNet, { signed: true, compact: true })}/mo
              </span>
              <span className="text-muted-foreground">({forecastSource})</span>
              {weightedRate > 0 && (
                <span className="text-muted-foreground">· {weightedRate.toFixed(1)}% APR</span>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="-mt-2 px-2 pb-2">
        <AreaChart
          data={data}
          xKey="date"
          height={180}
          showAxis={false}
          series={[{ key: "value", label: "Net Worth", color: "var(--primary)" }]}
        />
      </div>
    </Card>
  );
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

/** Average monthly net (income - expense) over the last N completed months. */
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

/** Weighted APR across asset accounts that have an APR set, weighted by balance. */
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
