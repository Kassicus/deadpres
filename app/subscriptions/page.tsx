"use client";

import * as React from "react";
import { Plus, Repeat, Pencil, Trash2, MoreHorizontal, Pause, Play, CalendarDays } from "lucide-react";
import { Topbar } from "@/components/shell/topbar";
import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useFinance } from "@/lib/store";
import { EmptyState } from "@/components/shell/empty-state";
import { COLOR_HEX } from "@/lib/colors";
import { getIcon } from "@/lib/icons";
import { formatCurrency, formatRelative } from "@/lib/format";
import { monthlyEquivalent, monthlySubscriptionsTotal, yearlyEquivalent } from "@/lib/finance";
import { Donut } from "@/components/charts/donut";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SubscriptionDialog } from "@/components/subscriptions/subscription-dialog";
import type { Subscription } from "@/lib/types";
import { toast } from "sonner";

export default function SubscriptionsPage() {
  const subscriptions = useFinance((s) => s.subscriptions);
  const updateSubscription = useFinance((s) => s.updateSubscription);
  const removeSubscription = useFinance((s) => s.removeSubscription);

  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Subscription | undefined>(undefined);

  const active = subscriptions.filter((s) => s.active);
  const monthly = monthlySubscriptionsTotal(active);
  const yearly = monthly * 12;

  const sorted = React.useMemo(
    () => [...subscriptions].sort((a, b) => new Date(a.nextChargeDate).getTime() - new Date(b.nextChargeDate).getTime()),
    [subscriptions],
  );

  const donutData = active.map((s) => ({
    name: s.name,
    value: monthlyEquivalent(s.amount, s.frequency),
    color: COLOR_HEX[s.color],
  }));

  function openNew() {
    setEditing(undefined);
    setDialogOpen(true);
  }

  function openEdit(s: Subscription) {
    setEditing(s);
    setDialogOpen(true);
  }

  return (
    <>
      <Topbar title="Subscriptions" description="Stay on top of your recurring charges." />
      <main className="px-4 lg:px-8 py-6 max-w-[1400px] w-full">
        <PageHeader
          title="Subscriptions"
          description={`${active.length} active subscription${active.length === 1 ? "" : "s"}`}
          action={
            <Button onClick={openNew} className="gap-1.5">
              <Plus /> New subscription
            </Button>
          }
        />

        {subscriptions.length === 0 ? (
          <EmptyState
            icon={Repeat}
            title="No subscriptions yet"
            description="Add Netflix, Spotify, your gym — anything that bills on a schedule."
            action={
              <Button onClick={openNew} className="gap-1.5">
                <Plus /> Add subscription
              </Button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-1 p-5">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Total per month</div>
              <div className="text-3xl font-semibold tracking-tight num mt-1">{formatCurrency(monthly)}</div>
              <div className="text-sm text-muted-foreground mt-1">
                <span className="num">{formatCurrency(yearly)}</span> per year
              </div>
              <div className="mt-6">
                {donutData.length > 0 && (
                  <Donut
                    data={donutData}
                    height={220}
                    centerLabel="Monthly"
                    centerValue={formatCurrency(monthly, { compact: true })}
                  />
                )}
              </div>
            </Card>

            <Card className="lg:col-span-2 p-2">
              <div className="px-3 py-3 text-sm font-medium border-b border-border/50">
                All subscriptions
              </div>
              <div className="divide-y divide-border/40">
                {sorted.map((s) => {
                  const Icon = getIcon(s.icon);
                  return (
                    <div key={s.id} className="group flex items-center gap-3 p-3 hover:bg-accent/30 transition-colors">
                      <div
                        className="size-10 rounded-xl grid place-items-center shrink-0"
                        style={{ background: `${COLOR_HEX[s.color]}26`, color: COLOR_HEX[s.color] }}
                      >
                        <Icon className="size-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium truncate">{s.name}</span>
                          {!s.active && (
                            <span className="text-[10px] uppercase tracking-widest text-muted-foreground bg-muted rounded-md px-1.5 py-0.5">
                              Paused
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                          <CalendarDays className="size-3" />
                          {s.frequency}
                          <span>·</span>
                          <span>Next {formatRelative(s.nextChargeDate)}</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-semibold num text-sm">{formatCurrency(s.amount)}</div>
                        <div className="text-[11px] text-muted-foreground num">
                          {formatCurrency(monthlyEquivalent(s.amount, s.frequency), { compact: true })}/mo
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="opacity-0 group-hover:opacity-100"
                            aria-label="Subscription actions"
                          >
                            <MoreHorizontal />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(s)}>
                            <Pencil /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              updateSubscription(s.id, { active: !s.active });
                              toast.success(s.active ? "Paused" : "Resumed");
                            }}
                          >
                            {s.active ? <Pause /> : <Play />}
                            {s.active ? "Pause" : "Resume"}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => {
                              if (confirm(`Cancel "${s.name}"?`)) {
                                removeSubscription(s.id);
                                toast.success("Subscription removed");
                              }
                            }}
                          >
                            <Trash2 /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>
        )}

        <SubscriptionDialog open={dialogOpen} onOpenChange={setDialogOpen} subscription={editing} />
      </main>
    </>
  );
}
