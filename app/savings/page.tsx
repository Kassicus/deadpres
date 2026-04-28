"use client";

import * as React from "react";
import { Plus, Target, Pencil, Trash2, MoreHorizontal, CalendarRange, Sparkles } from "lucide-react";
import { Topbar } from "@/components/shell/topbar";
import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { useFinance } from "@/lib/store";
import { EmptyState } from "@/components/shell/empty-state";
import { COLOR_HEX } from "@/lib/colors";
import { getIcon } from "@/lib/icons";
import { formatCurrency, formatDate } from "@/lib/format";
import { monthsToGoal } from "@/lib/finance";
import { GoalDialog } from "@/components/savings/goal-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { SavingsGoal } from "@/lib/types";
import { toast } from "sonner";

export default function SavingsPage() {
  const goals = useFinance((s) => s.goals);
  const updateGoal = useFinance((s) => s.updateGoal);
  const removeGoal = useFinance((s) => s.removeGoal);

  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<SavingsGoal | undefined>(undefined);

  const totalSaved = goals.reduce((s, g) => s + g.currentAmount, 0);
  const totalTarget = goals.reduce((s, g) => s + g.targetAmount, 0);
  const totalMonthly = goals.reduce((s, g) => s + (g.monthlyContribution ?? 0), 0);

  function openNew() {
    setEditing(undefined);
    setOpen(true);
  }

  function openEdit(g: SavingsGoal) {
    setEditing(g);
    setOpen(true);
  }

  return (
    <>
      <Topbar title="Savings goals" description="Save up for what matters." />
      <main className="px-4 lg:px-8 py-6 max-w-[1400px] w-full">
        <PageHeader
          title="Savings goals"
          description={goals.length === 0 ? "Track and project your savings goals." : `${goals.length} goal${goals.length === 1 ? "" : "s"} · ${formatCurrency(totalSaved)} saved of ${formatCurrency(totalTarget)}`}
          action={
            <Button onClick={openNew} className="gap-1.5">
              <Plus /> New goal
            </Button>
          }
        />

        {goals.length === 0 ? (
          <EmptyState
            icon={Target}
            title="No goals yet"
            description="Create your first goal — emergency fund, trip, big purchase, anything."
            action={
              <Button onClick={openNew} className="gap-1.5">
                <Plus /> Add goal
              </Button>
            }
          />
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
              <SummaryStat label="Saved" value={formatCurrency(totalSaved)} />
              <SummaryStat label="Target" value={formatCurrency(totalTarget)} />
              <SummaryStat label="Monthly contribution" value={formatCurrency(totalMonthly)} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {goals.map((g) => (
                <GoalCard
                  key={g.id}
                  goal={g}
                  onEdit={() => openEdit(g)}
                  onRemove={() => {
                    if (confirm(`Delete "${g.name}"?`)) {
                      removeGoal(g.id);
                      toast.success("Goal removed");
                    }
                  }}
                  onAddContribution={(amount) => {
                    updateGoal(g.id, { currentAmount: g.currentAmount + amount });
                    toast.success(`Added ${formatCurrency(amount)} to ${g.name}`);
                  }}
                />
              ))}
            </div>
          </>
        )}

        <GoalDialog open={open} onOpenChange={setOpen} goal={editing} />
      </main>
    </>
  );
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/70 bg-card p-4">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="text-2xl font-semibold tracking-tight num mt-1">{value}</div>
    </div>
  );
}

function GoalCard({
  goal,
  onEdit,
  onRemove,
  onAddContribution,
}: {
  goal: SavingsGoal;
  onEdit: () => void;
  onRemove: () => void;
  onAddContribution: (amount: number) => void;
}) {
  const [adding, setAdding] = React.useState(false);
  const [amount, setAmount] = React.useState("");
  const Icon = getIcon(goal.icon);
  const pct = Math.min(100, (goal.currentAmount / goal.targetAmount) * 100);
  const monthsLeft = monthsToGoal(goal.currentAmount, goal.targetAmount, goal.monthlyContribution ?? 0);
  const remaining = Math.max(0, goal.targetAmount - goal.currentAmount);

  function submitAdd(e: React.FormEvent) {
    e.preventDefault();
    const a = parseFloat(amount);
    if (!Number.isFinite(a) || a <= 0) return;
    onAddContribution(a);
    setAmount("");
    setAdding(false);
  }

  return (
    <Card className="relative overflow-hidden p-5 group">
      <div
        className="absolute -top-12 -right-12 size-40 rounded-full opacity-30 blur-3xl pointer-events-none"
        style={{ background: COLOR_HEX[goal.color] }}
      />
      <div className="relative space-y-4">
        <div className="flex items-start gap-3">
          <div
            className="size-10 rounded-xl grid place-items-center shrink-0"
            style={{ background: `${COLOR_HEX[goal.color]}26`, color: COLOR_HEX[goal.color] }}
          >
            <Icon className="size-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <div className="font-semibold tracking-tight truncate flex-1">{goal.name}</div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon-sm" className="opacity-0 group-hover:opacity-100">
                    <MoreHorizontal />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={onEdit}><Pencil /> Edit</DropdownMenuItem>
                  <DropdownMenuItem onClick={onRemove} className="text-destructive focus:text-destructive">
                    <Trash2 /> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <div className="text-xs text-muted-foreground">
              {goal.targetDate && (
                <span className="inline-flex items-center gap-1">
                  <CalendarRange className="size-3" /> by {formatDate(goal.targetDate)}
                </span>
              )}
            </div>
          </div>
        </div>

        <div>
          <div className="flex items-baseline justify-between mb-1.5">
            <div className="text-2xl font-semibold tracking-tight num">
              {formatCurrency(goal.currentAmount)}
            </div>
            <div className="text-xs text-muted-foreground num">/ {formatCurrency(goal.targetAmount)}</div>
          </div>
          <Progress value={pct} indicatorStyle={{ background: COLOR_HEX[goal.color] }} />
          <div className="flex items-center justify-between mt-1.5 text-[11px] text-muted-foreground">
            <span>{pct.toFixed(0)}% complete</span>
            <span className="num">{formatCurrency(remaining)} to go</span>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">
            {goal.monthlyContribution
              ? <>Saving <span className="text-foreground font-medium num">{formatCurrency(goal.monthlyContribution)}</span>/mo</>
              : "No monthly plan"}
          </span>
          <span className="font-medium">
            {monthsLeft === Infinity ? "—" : monthsLeft <= 0 ? <span className="text-success inline-flex items-center gap-1"><Sparkles className="size-3" /> Done!</span> : `${formatMonths(monthsLeft)} left`}
          </span>
        </div>

        {!adding ? (
          <Button variant="soft" size="sm" className="w-full" onClick={() => setAdding(true)}>
            <Plus /> Add contribution
          </Button>
        ) : (
          <form onSubmit={submitAdd} className="flex gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                className="pl-7 num h-9"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                autoFocus
              />
            </div>
            <Button type="submit" size="sm">Add</Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => { setAdding(false); setAmount(""); }}>Cancel</Button>
          </form>
        )}
      </div>
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
