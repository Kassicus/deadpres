"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, Flame } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useFinance } from "@/lib/store";
import { formatCurrency } from "@/lib/format";
import { simulateDebtPayoff, type DebtScheduleAccount } from "@/lib/finance";
import { COLOR_HEX } from "@/lib/colors";
import { Progress } from "@/components/ui/progress";

export function DebtOverview() {
  const accounts = useFinance((s) => s.accounts);
  const plan = useFinance((s) => s.debtPlan);

  const debts = React.useMemo(
    () =>
      accounts
        .filter((a) => (a.type === "credit" || a.type === "loan") && a.balance > 0 && !a.archived)
        .map<DebtScheduleAccount>((a) => ({
          id: a.id,
          name: a.name,
          startingBalance: a.balance,
          apr: a.apr ?? 0,
          minimumPayment: a.minimumPayment ?? 0,
          color: COLOR_HEX[a.color],
        })),
    [accounts],
  );

  const total = debts.reduce((s, d) => s + d.startingBalance, 0);
  const minimums = debts.reduce((s, d) => s + d.minimumPayment, 0);

  const result = React.useMemo(() => {
    if (debts.length === 0) return null;
    return simulateDebtPayoff(debts, plan.strategy, plan.extraPerMonth, plan.customOrder);
  }, [debts, plan]);

  return (
    <Card className="relative overflow-hidden">
      <div className="absolute -top-12 -right-12 size-48 rounded-full bg-coral/10 blur-3xl pointer-events-none" />
      <CardHeader className="pb-1">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Flame className="size-4 text-coral" /> Debt
          </CardTitle>
          <Link href="/debt" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
            Plan payoff <ArrowRight className="size-3" />
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {debts.length === 0 ? (
          <div className="text-sm text-muted-foreground py-6 text-center">Debt-free! Or add some debts to track.</div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Owed</div>
                <div className="text-lg font-semibold tracking-tight num">{formatCurrency(total)}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Minimums</div>
                <div className="text-lg font-semibold tracking-tight num">{formatCurrency(minimums)}/mo</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Debt-free in</div>
                <div className="text-lg font-semibold tracking-tight num">
                  {result ? formatMonths(result.payoffMonth) : "—"}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              {debts.slice(0, 3).map((d) => {
                const pct = total > 0 ? (d.startingBalance / total) * 100 : 0;
                return (
                  <div key={d.id} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="truncate">{d.name}</span>
                      <span className="num text-muted-foreground">
                        {formatCurrency(d.startingBalance)} <span className="text-xs">@ {d.apr}%</span>
                      </span>
                    </div>
                    <Progress value={pct} indicatorClassName="bg-coral/70" />
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function formatMonths(m: number): string {
  if (m <= 0) return "—";
  const years = Math.floor(m / 12);
  const months = m % 12;
  if (years === 0) return `${months}mo`;
  if (months === 0) return `${years}yr`;
  return `${years}y ${months}m`;
}
