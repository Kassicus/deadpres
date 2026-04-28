"use client";

import * as React from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useFinance } from "@/lib/store";
import { ArrowRight, CalendarDays, Repeat } from "lucide-react";
import { COLOR_HEX } from "@/lib/colors";
import { getIcon } from "@/lib/icons";
import { formatCurrency, formatRelative } from "@/lib/format";
import { EmptyState } from "@/components/shell/empty-state";

export function UpcomingBills() {
  const subscriptions = useFinance((s) => s.subscriptions);

  const upcoming = React.useMemo(() => {
    return [...subscriptions]
      .filter((s) => s.active)
      .sort((a, b) => new Date(a.nextChargeDate).getTime() - new Date(b.nextChargeDate).getTime())
      .slice(0, 5);
  }, [subscriptions]);

  return (
    <Card>
      <CardHeader className="pb-1">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Upcoming charges</CardTitle>
          <Link href="/subscriptions" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
            Manage <ArrowRight className="size-3" />
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {upcoming.length === 0 ? (
          <EmptyState
            icon={Repeat}
            title="No subscriptions"
            description="Add recurring charges so you never get surprised."
            className="py-8"
          />
        ) : (
          <div className="space-y-1.5">
            {upcoming.map((s) => {
              const Icon = getIcon(s.icon);
              return (
                <div key={s.id} className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-accent/40 transition-colors">
                  <div
                    className="size-9 rounded-lg grid place-items-center shrink-0"
                    style={{ background: `${COLOR_HEX[s.color]}22`, color: COLOR_HEX[s.color] }}
                  >
                    <Icon className="size-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{s.name}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <CalendarDays className="size-3" /> {formatRelative(s.nextChargeDate)}
                    </div>
                  </div>
                  <div className="text-sm font-semibold num">{formatCurrency(s.amount)}</div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
