"use client";

import Link from "next/link";
import { ArrowRight, Target } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useFinance } from "@/lib/store";
import { Progress } from "@/components/ui/progress";
import { formatCurrency } from "@/lib/format";
import { COLOR_HEX } from "@/lib/colors";
import { getIcon } from "@/lib/icons";

export function SavingsProgress() {
  const goals = useFinance((s) => s.goals);

  return (
    <Card>
      <CardHeader className="pb-1">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="size-4 text-mint" /> Goals
          </CardTitle>
          <Link href="/savings" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
            All goals <ArrowRight className="size-3" />
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {goals.length === 0 ? (
          <div className="text-sm text-muted-foreground py-6 text-center">No savings goals yet.</div>
        ) : (
          <div className="space-y-3">
            {goals.slice(0, 4).map((g) => {
              const pct = Math.min(100, (g.currentAmount / g.targetAmount) * 100);
              const Icon = getIcon(g.icon);
              return (
                <div key={g.id} className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <div
                      className="size-7 rounded-md grid place-items-center shrink-0"
                      style={{ background: `${COLOR_HEX[g.color]}22`, color: COLOR_HEX[g.color] }}
                    >
                      <Icon className="size-3.5" />
                    </div>
                    <span className="text-sm font-medium flex-1 truncate">{g.name}</span>
                    <span className="text-xs num text-muted-foreground">
                      {formatCurrency(g.currentAmount, { compact: true })} / {formatCurrency(g.targetAmount, { compact: true })}
                    </span>
                  </div>
                  <Progress value={pct} indicatorStyle={{ background: COLOR_HEX[g.color] }} />
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
