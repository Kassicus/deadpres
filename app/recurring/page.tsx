"use client";

import * as React from "react";
import { Plus, Repeat, Pencil, Trash2, MoreHorizontal, Pause, Play, CalendarDays, ArrowUpRight, ArrowDownLeft } from "lucide-react";
import { Topbar } from "@/components/shell/topbar";
import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useFinance } from "@/lib/store";
import { EmptyState } from "@/components/shell/empty-state";
import { COLOR_HEX } from "@/lib/colors";
import { getIcon } from "@/lib/icons";
import { formatCurrency, formatRelative } from "@/lib/format";
import { monthlyAmount, monthlyRecurringTotal } from "@/lib/finance";
import { Donut } from "@/components/charts/donut";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { RecurringDialog } from "@/components/recurring/recurring-dialog";
import type { RecurringDirection, RecurringPayment } from "@/lib/types";
import { toast } from "sonner";
import { getCategory } from "@/lib/categories";
import { formatScheduleSummary } from "@/lib/schedule";
import { cn } from "@/lib/utils";

type Filter = "all" | RecurringDirection;

export default function RecurringPage() {
  const items = useFinance((s) => s.recurringPayments);
  const updateRecurringPayment = useFinance((s) => s.updateRecurringPayment);
  const removeRecurringPayment = useFinance((s) => s.removeRecurringPayment);

  const [filter, setFilter] = React.useState<Filter>("all");
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<RecurringPayment | undefined>(undefined);
  const [defaultDirection, setDefaultDirection] = React.useState<RecurringDirection>("expense");

  const active = items.filter((s) => s.active);
  const incomeTotal = monthlyRecurringTotal(active, "income");
  const expenseTotal = monthlyRecurringTotal(active, "expense");
  const net = incomeTotal - expenseTotal;

  const filtered = filter === "all" ? items : items.filter((i) => i.direction === filter);
  const sorted = React.useMemo(
    () => [...filtered].sort((a, b) => new Date(a.nextChargeDate).getTime() - new Date(b.nextChargeDate).getTime()),
    [filtered],
  );

  const donutDirection = filter === "income" ? "income" : "expense";
  const donutItems = active.filter((s) => s.direction === donutDirection);
  const donutData = donutItems.map((s) => ({
    name: s.name,
    value: monthlyAmount(s),
    color: COLOR_HEX[s.color],
  }));

  function openNew(dir: RecurringDirection = "expense") {
    setEditing(undefined);
    setDefaultDirection(dir);
    setDialogOpen(true);
  }

  function openEdit(s: RecurringPayment) {
    setEditing(s);
    setDialogOpen(true);
  }

  return (
    <>
      <Topbar title="Recurring payments" description="Bills, subscriptions, paychecks — schedule everything that repeats." />
      <main className="px-4 lg:px-8 py-6 max-w-[1400px] w-full mx-auto">
        <PageHeader
          title="Recurring"
          description={`${active.length} active`}
          action={
            <Button onClick={() => openNew(filter === "income" ? "income" : "expense")} className="gap-1.5">
              <Plus /> New recurring
            </Button>
          }
        />

        {items.length === 0 ? (
          <EmptyState
            icon={Repeat}
            title="Nothing scheduled yet"
            description="Add your paycheck, rent, your phone bill — anything that hits on a schedule."
            action={
              <div className="flex gap-2">
                <Button onClick={() => openNew("income")} variant="soft" className="gap-1.5">
                  <ArrowDownLeft /> Add income
                </Button>
                <Button onClick={() => openNew("expense")} className="gap-1.5">
                  <ArrowUpRight /> Add expense
                </Button>
              </div>
            }
          />
        ) : (
          <>
            <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-6">
              <SummaryStat
                label="Income / mo"
                value={formatCurrency(incomeTotal)}
                color="text-success"
                icon={ArrowDownLeft}
              />
              <SummaryStat
                label="Expenses / mo"
                value={formatCurrency(expenseTotal)}
                color="text-coral"
                icon={ArrowUpRight}
              />
              <SummaryStat
                label="Net / mo"
                value={formatCurrency(net, { signed: true })}
                color={net >= 0 ? "text-success" : "text-destructive"}
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
              <Card className="lg:col-span-1 p-4 sm:p-5">
                <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
                  <TabsList className="w-full grid grid-cols-3">
                    <TabsTrigger value="all">All</TabsTrigger>
                    <TabsTrigger value="income" className="gap-1"><ArrowDownLeft className="size-3" /> In</TabsTrigger>
                    <TabsTrigger value="expense" className="gap-1"><ArrowUpRight className="size-3" /> Out</TabsTrigger>
                  </TabsList>
                </Tabs>

                <div className="mt-5">
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    {donutDirection === "income" ? "Income breakdown" : "Expense breakdown"}
                  </div>
                  <div className="text-2xl font-semibold tracking-tight num mt-1">
                    {formatCurrency(donutDirection === "income" ? incomeTotal : expenseTotal)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    <span className="num">{formatCurrency((donutDirection === "income" ? incomeTotal : expenseTotal) * 12)}</span> per year
                  </div>
                  <div className="mt-4">
                    {donutData.length > 0 ? (
                      <Donut
                        data={donutData}
                        height={200}
                        centerLabel="Monthly"
                        centerValue={formatCurrency(donutDirection === "income" ? incomeTotal : expenseTotal, { compact: true })}
                      />
                    ) : (
                      <div className="text-xs text-muted-foreground py-12 text-center">
                        No active {donutDirection === "income" ? "income" : "expenses"} yet.
                      </div>
                    )}
                  </div>
                </div>
              </Card>

              <Card className="lg:col-span-2 p-2">
                <div className="px-3 py-3 text-sm font-medium border-b border-border/50 flex items-center justify-between">
                  <span>{filter === "all" ? "All recurring" : filter === "income" ? "Income" : "Expenses"}</span>
                  <span className="text-[11px] text-muted-foreground font-normal">{sorted.length} {sorted.length === 1 ? "item" : "items"}</span>
                </div>
                <div className="divide-y divide-border/40">
                  {sorted.map((s) => {
                    const Icon = getIcon(s.icon);
                    const cat = getCategory(s.category);
                    const monthly = monthlyAmount(s);
                    const isIncome = s.direction === "income";
                    return (
                      <div key={s.id} className="group flex items-center gap-3 p-3 hover:bg-accent/30 transition-colors">
                        <div
                          className="size-10 rounded-xl grid place-items-center shrink-0 relative"
                          style={{ background: `${COLOR_HEX[s.color]}26`, color: COLOR_HEX[s.color] }}
                        >
                          <Icon className="size-5" />
                          <div className="absolute -bottom-1 -right-1 size-4 rounded-full bg-card border border-border grid place-items-center">
                            {isIncome ? (
                              <ArrowDownLeft className="size-2.5 text-success" />
                            ) : (
                              <ArrowUpRight className="size-2.5 text-foreground" />
                            )}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium truncate">{s.name}</span>
                            {!s.active && (
                              <span className="text-[10px] uppercase tracking-widest text-muted-foreground bg-muted rounded-md px-1.5 py-0.5 shrink-0">
                                Paused
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground flex items-center gap-1.5 min-w-0 truncate">
                            <CalendarDays className="size-3 shrink-0" />
                            <span className="truncate">{formatScheduleSummary(s.schedule)}</span>
                            <span className="shrink-0 hidden sm:inline">·</span>
                            <span className="shrink-0 hidden sm:inline truncate">{cat.name}</span>
                            <span className="shrink-0">·</span>
                            <span className="shrink-0">Next {formatRelative(s.nextChargeDate)}</span>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className={cn("font-semibold num text-sm", isIncome ? "text-success" : "text-foreground")}>
                            {isIncome ? "+" : "−"}
                            {formatCurrency(s.amount)}
                          </div>
                          <div className="text-[11px] text-muted-foreground num">
                            {formatCurrency(monthly, { compact: true })}/mo
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 shrink-0"
                              aria-label="Actions"
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
                                updateRecurringPayment(s.id, { active: !s.active });
                                toast.success(s.active ? "Paused" : "Resumed");
                              }}
                            >
                              {s.active ? <Pause /> : <Play />}
                              {s.active ? "Pause" : "Resume"}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => {
                                if (confirm(`Delete "${s.name}"?`)) {
                                  removeRecurringPayment(s.id);
                                  toast.success("Removed");
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
          </>
        )}

        <RecurringDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          recurring={editing}
          defaultDirection={defaultDirection}
        />
      </main>
    </>
  );
}

function SummaryStat({
  label,
  value,
  color,
  icon: Icon,
}: {
  label: string;
  value: string;
  color: string;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-xl border border-border/70 bg-card p-3 sm:p-4 min-w-0">
      <div className="flex items-center gap-2">
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground truncate">{label}</div>
        {Icon && <Icon className="size-3 text-muted-foreground shrink-0" />}
      </div>
      <div className={cn("text-lg sm:text-2xl font-semibold tracking-tight num mt-1 truncate", color)}>{value}</div>
    </div>
  );
}
