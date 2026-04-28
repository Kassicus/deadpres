"use client";

import * as React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useFinance } from "@/lib/store";
import { monthBoundary, transactionsInRange } from "@/lib/finance";
import { Donut } from "@/components/charts/donut";
import { COLOR_HEX } from "@/lib/colors";
import { getCategory } from "@/lib/categories";
import { formatCurrency } from "@/lib/format";

export function SpendingDonut() {
  const transactions = useFinance((s) => s.transactions);

  const data = React.useMemo(() => {
    const { start, end } = monthBoundary();
    const txs = transactionsInRange(transactions, start, end).filter((t) => t.type === "expense");
    const totals = new Map<string, number>();
    for (const t of txs) {
      totals.set(t.category, (totals.get(t.category) ?? 0) + t.amount);
    }
    return Array.from(totals.entries())
      .map(([cat, value]) => {
        const c = getCategory(cat);
        return { name: c.name, value, color: COLOR_HEX[c.color] };
      })
      .sort((a, b) => b.value - a.value);
  }, [transactions]);

  const total = data.reduce((s, d) => s + d.value, 0);
  const top = data.slice(0, 5);
  const other = data.slice(5);
  const otherTotal = other.reduce((s, d) => s + d.value, 0);
  const display = otherTotal > 0 ? [...top, { name: "Other", value: otherTotal, color: "var(--muted-foreground)" }] : top;

  return (
    <Card>
      <CardHeader className="pb-1">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Spending breakdown</CardTitle>
          <div className="text-xs text-muted-foreground">This month</div>
        </div>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="text-sm text-muted-foreground py-12 text-center">No expenses yet this month.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr] gap-4 items-center">
            <Donut data={display} centerLabel="This month" centerValue={formatCurrency(total, { compact: true })} height={200} />
            <div className="space-y-2">
              {display.map((d) => (
                <div key={d.name} className="flex items-center gap-2 text-sm">
                  <span className="size-2.5 rounded-full" style={{ background: d.color }} />
                  <span className="truncate">{d.name}</span>
                  <span className="ml-auto num font-medium">{formatCurrency(d.value)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
