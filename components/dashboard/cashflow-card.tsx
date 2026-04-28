"use client";

import * as React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useFinance } from "@/lib/store";
import { cashflow, monthBoundary, transactionsInRange } from "@/lib/finance";
import { formatCurrency } from "@/lib/format";
import { BarChart } from "@/components/charts/bar-chart";

export function CashflowCard() {
  const transactions = useFinance((s) => s.transactions);

  const data = React.useMemo(() => {
    const months: { month: string; income: number; expense: number }[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const start = new Date(d.getFullYear(), d.getMonth(), 1);
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
      const txs = transactionsInRange(transactions, start, end);
      const cf = cashflow(txs);
      months.push({
        month: d.toLocaleDateString("en-US", { month: "short" }),
        income: cf.income,
        expense: cf.expense,
      });
    }
    return months;
  }, [transactions]);

  const { start, end } = monthBoundary();
  const thisMonth = cashflow(transactionsInRange(transactions, start, end));

  return (
    <Card>
      <CardHeader className="pb-1">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Cashflow</CardTitle>
          <div className="text-xs text-muted-foreground">Last 6 months</div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4 mb-4">
          <Stat label="Income" value={formatCurrency(thisMonth.income)} color="text-success" />
          <Stat label="Spending" value={formatCurrency(thisMonth.expense)} color="text-foreground" />
          <Stat
            label="Net"
            value={formatCurrency(thisMonth.net, { signed: true })}
            color={thisMonth.net >= 0 ? "text-success" : "text-destructive"}
          />
        </div>
        <BarChart
          data={data}
          xKey="month"
          height={180}
          series={[
            { key: "income", label: "Income", color: "var(--mint)" },
            { key: "expense", label: "Expense", color: "var(--coral)" },
          ]}
        />
      </CardContent>
    </Card>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className={`text-lg font-semibold tracking-tight num ${color}`}>{value}</div>
    </div>
  );
}
