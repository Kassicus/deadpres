"use client";

import * as React from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useFinance } from "@/lib/store";
import { ArrowDownLeft, ArrowRight, ArrowUpRight, CalendarDays, Repeat } from "lucide-react";
import { COLOR_HEX } from "@/lib/colors";
import { getIcon } from "@/lib/icons";
import { formatCurrency, formatRelative } from "@/lib/format";
import { EmptyState } from "@/components/shell/empty-state";
import { cn } from "@/lib/utils";

export function UpcomingBills() {
  const recurringPayments = useFinance((s) => s.recurringPayments);

  const upcoming = React.useMemo(() => {
    return [...recurringPayments]
      .filter((s) => s.active)
      .sort((a, b) => new Date(a.nextChargeDate).getTime() - new Date(b.nextChargeDate).getTime())
      .slice(0, 6);
  }, [recurringPayments]);

  return (
    <Card>
      <CardHeader className="pb-1">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Upcoming</CardTitle>
          <Link href="/recurring" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
            Manage <ArrowRight className="size-3" />
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {upcoming.length === 0 ? (
          <EmptyState
            icon={Repeat}
            title="Nothing scheduled"
            description="Add bills, paychecks, or anything else that repeats."
            className="py-8"
          />
        ) : (
          <div className="space-y-1.5">
            {upcoming.map((s) => {
              const Icon = getIcon(s.icon);
              const isIncome = s.direction === "income";
              return (
                <div key={s.id} className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-accent/40 transition-colors">
                  <div
                    className="size-9 rounded-lg grid place-items-center shrink-0 relative"
                    style={{ background: `${COLOR_HEX[s.color]}22`, color: COLOR_HEX[s.color] }}
                  >
                    <Icon className="size-4" />
                    <div className="absolute -bottom-1 -right-1 size-3.5 rounded-full bg-card border border-border grid place-items-center">
                      {isIncome ? (
                        <ArrowDownLeft className="size-2 text-success" />
                      ) : (
                        <ArrowUpRight className="size-2 text-foreground" />
                      )}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{s.name}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <CalendarDays className="size-3" /> {formatRelative(s.nextChargeDate)}
                    </div>
                  </div>
                  <div className={cn("text-sm font-semibold num", isIncome ? "text-success" : "text-foreground")}>
                    {isIncome ? "+" : "−"}
                    {formatCurrency(s.amount)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
