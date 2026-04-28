"use client";

import * as React from "react";
import { TrendingUp, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useFinance } from "@/lib/store";
import { netWorth, projectGrowth } from "@/lib/finance";
import { formatCurrency, formatPercent } from "@/lib/format";
import { AreaChart } from "@/components/charts/area-chart";

export function NetWorthCard() {
  const accounts = useFinance((s) => s.accounts);
  const transactions = useFinance((s) => s.transactions);

  const { assets, liabilities, total } = netWorth(accounts);

  // Build a 6-month trailing trend by working backwards from current balances using transactions.
  const trend = React.useMemo(() => buildTrailingNetWorth(accounts, transactions, 6), [accounts, transactions]);

  // 12-month forward projection at investment APR average if we have an investment, else 0.
  const investRate = accounts.find((a) => a.type === "investment")?.apr ?? 6;
  const forward = React.useMemo(() => {
    return projectGrowth({
      startingBalance: total,
      monthlyContribution: 500,
      annualRatePercent: investRate,
      months: 12,
    });
  }, [total, investRate]);

  const data = [
    ...trend.map((p) => ({ date: p.date, value: p.value, kind: "history" as const })),
    ...forward.slice(1).map((p) => ({ date: p.date, value: p.balance, kind: "forecast" as const })),
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
            <div
              className={`flex items-center gap-1 text-sm font-medium ${positive ? "text-success" : "text-destructive"}`}
            >
              {positive ? <ArrowUpRight className="size-4" /> : <ArrowDownRight className="size-4" />}
              <span className="num">{formatCurrency(Math.abs(change))}</span>
              <span className="text-muted-foreground font-normal">({formatPercent(Math.abs(pct))})</span>
            </div>
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
        <div className="flex items-center gap-2 self-start">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground rounded-lg bg-card/60 backdrop-blur border border-border/60 px-2.5 py-1.5">
            <TrendingUp className="size-3.5 text-primary" />
            12-mo forecast
          </div>
        </div>
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
  accounts: ReturnType<typeof useFinance.getState>["accounts"],
  txs: ReturnType<typeof useFinance.getState>["transactions"],
  monthsBack: number,
): { date: string; value: number }[] {
  const today = new Date();
  // Start from current net worth and rewind transactions by month.
  let balance = netWorth(accounts).total;
  const points: { date: string; value: number }[] = [{ date: today.toISOString(), value: balance }];

  const sorted = [...txs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  let cursor = new Date(today.getFullYear(), today.getMonth(), 1);

  for (let i = 0; i < monthsBack; i++) {
    const monthStart = new Date(cursor);
    cursor = new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1);

    // Subtract this month's net activity from running balance going backwards.
    const monthTxs = sorted.filter((t) => {
      const td = new Date(t.date);
      return td >= cursor && td < monthStart;
    });

    let monthNet = 0;
    for (const t of monthTxs) {
      if (t.type === "income") monthNet += t.amount;
      else if (t.type === "expense") monthNet -= t.amount;
    }
    // Going back: previous balance = current - delta from current period (approximation).
    balance -= monthNet;
    points.unshift({ date: cursor.toISOString(), value: Math.max(0, balance) });
  }

  return points;
}
