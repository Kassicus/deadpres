"use client";

import * as React from "react";
import { motion, LayoutGroup } from "framer-motion";
import { Flame, TrendingDown, CalendarRange, DollarSign, Sparkles, ArrowDown, AlertTriangle } from "lucide-react";
import { Topbar } from "@/components/shell/topbar";
import { PageHeader } from "@/components/shell/page-header";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { useFinance } from "@/lib/store";
import { simulateDebtPayoff, compareStrategies, orderDebts, type DebtScheduleAccount } from "@/lib/finance";
import type { DebtStrategy } from "@/lib/types";
import { COLOR_HEX } from "@/lib/colors";
import { formatCurrency } from "@/lib/format";
import { EmptyState } from "@/components/shell/empty-state";
import {
  AreaChart as ReAreaChart,
  Area,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

const STRATEGY_LABELS: Record<DebtStrategy, string> = {
  avalanche: "Avalanche",
  snowball: "Snowball",
  "highest-balance": "Biggest first",
  custom: "Custom",
};

const STRATEGY_DESC: Record<DebtStrategy, string> = {
  avalanche: "Pay highest APR first — saves the most on interest, mathematically optimal.",
  snowball: "Pay smallest balance first — quick wins keep momentum going.",
  "highest-balance": "Pay biggest balance first — useful when consolidating.",
  custom: "Set your own priority order by dragging.",
};

export default function DebtPage() {
  const accounts = useFinance((s) => s.accounts);
  const plan = useFinance((s) => s.debtPlan);
  const setDebtPlan = useFinance((s) => s.setDebtPlan);

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

  const totalDebt = debts.reduce((s, d) => s + d.startingBalance, 0);
  const totalMin = debts.reduce((s, d) => s + d.minimumPayment, 0);

  // Active strategy with snowball/avalanche rollover (freed minimums roll into the cascade).
  const result = React.useMemo(() => {
    if (debts.length === 0) return null;
    return simulateDebtPayoff(debts, plan.strategy, plan.extraPerMonth, plan.customOrder);
  }, [debts, plan]);

  // True "minimums only" baseline: no extra, no rollover. Mirrors the alternative where
  // you stop paying a debt the moment it hits zero and never redirect that money.
  const minOnly = React.useMemo(() => {
    if (debts.length === 0) return null;
    return simulateDebtPayoff(debts, plan.strategy, 0, plan.customOrder, { rolloverFreedMinimums: false });
  }, [debts, plan.strategy, plan.customOrder]);

  // Strategy ordering for the rank badges and the per-debt list.
  const orderedDebts = React.useMemo(
    () => orderDebts(debts, plan.strategy, plan.customOrder),
    [debts, plan.strategy, plan.customOrder],
  );

  const comparison = React.useMemo(
    () => (debts.length === 0 ? [] : compareStrategies(debts, plan.extraPerMonth, plan.customOrder)),
    [debts, plan.extraPerMonth, plan.customOrder],
  );

  const interestSaved = (minOnly?.totalInterest ?? 0) - (result?.totalInterest ?? 0);
  const monthsSaved = (minOnly?.payoffMonth ?? 0) - (result?.payoffMonth ?? 0);

  // Surface debts whose minimum payment can't even cover monthly interest.
  const underwaterIds = result?.debtsBelowInterest ?? [];
  const underwaterDebts = debts.filter((d) => underwaterIds.includes(d.id));

  const chartData = React.useMemo(() => {
    if (!result) return [];
    return result.months.map((m) => {
      const row: Record<string, unknown> = {
        month: m.month,
        date: m.date,
        total: m.totalBalance,
      };
      for (const d of debts) {
        row[d.id] = m.byAccount[d.id]?.balance ?? 0;
      }
      return row;
    });
  }, [result, debts]);

  if (debts.length === 0) {
    return (
      <>
        <Topbar title="Debt payoff" description="Plan your way out of debt." />
        <main className="px-4 lg:px-8 py-6 max-w-[1400px] w-full">
          <EmptyState
            icon={Flame}
            title="No debts to pay off"
            description="Add a credit card or loan account to plan your payoff."
          />
        </main>
      </>
    );
  }

  return (
    <>
      <Topbar title="Debt payoff" description="Compare strategies, save interest, see the finish line." />
      <main className="px-4 lg:px-8 py-6 max-w-[1400px] w-full space-y-6">
        <PageHeader title="Debt payoff" description="Plan a strategy, throw extra at debt, watch the timeline shrink." />

        {/* Hero stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <HeroStat icon={DollarSign} label="Total debt" value={formatCurrency(totalDebt)} color="var(--coral)" />
          <HeroStat icon={CalendarRange} label="Min payments" value={`${formatCurrency(totalMin)}/mo`} color="var(--amber)" />
          <HeroStat
            icon={TrendingDown}
            label="Debt-free in"
            value={result ? (result.hitCap ? "Never" : formatMonths(result.payoffMonth)) : "—"}
            sublabel={result?.hitCap ? "Bump up extra to break even" : undefined}
            color="var(--mint)"
          />
          <HeroStat
            icon={Sparkles}
            label="Interest saved"
            value={interestSaved > 0 ? formatCurrency(interestSaved) : "—"}
            sublabel={monthsSaved > 0 ? `vs minimums only · ${monthsSaved}mo faster` : "vs minimums only"}
            color="var(--violet)"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
          {/* Timeline chart */}
          <Card className="p-5">
            <div className="flex items-center justify-between mb-1">
              <div>
                <h3 className="font-semibold tracking-tight">Payoff timeline</h3>
                <p className="text-xs text-muted-foreground">
                  Stacked balances over {result?.payoffMonth ?? 0} months · {STRATEGY_LABELS[plan.strategy]} method
                </p>
              </div>
            </div>
            <div className="mt-4 h-[320px]">
              <ResponsiveContainer>
                <ReAreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    {orderedDebts.map((d) => (
                      <linearGradient key={d.id} id={`grad-${d.id}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={d.color} stopOpacity={0.6} />
                        <stop offset="100%" stopColor={d.color} stopOpacity={0.05} />
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid stroke="var(--border)" strokeOpacity={0.5} vertical={false} />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(m: number) => (m % 6 === 0 ? `${m}m` : "")}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => formatCurrency(v as number, { compact: true })}
                    width={60}
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null;
                      return (
                        <div className="rounded-lg border border-border/70 bg-popover px-3 py-2 text-xs shadow-xl min-w-[180px]">
                          <div className="font-medium mb-1.5">Month {label}</div>
                          {payload
                            .filter((p) => (p.value as number) > 0.005)
                            .map((p) => {
                              const d = orderedDebts.find((x) => x.id === p.dataKey);
                              if (!d) return null;
                              return (
                                <div key={String(p.dataKey)} className="flex items-center gap-2 text-muted-foreground">
                                  <span className="size-2 rounded-full" style={{ background: d.color }} />
                                  <span className="truncate">{d.name}</span>
                                  <span className="ml-auto font-mono tabular-nums text-foreground">
                                    {formatCurrency(p.value as number, { compact: true })}
                                  </span>
                                </div>
                              );
                            })}
                          {payload.every((p) => (p.value as number) <= 0.005) && (
                            <div className="text-success font-medium">All paid off 🎉</div>
                          )}
                        </div>
                      );
                    }}
                  />
                  {/* Render in priority order so #1 sits at the bottom of the stack and visibly
                      deflates to zero first when paid off. stepAfter is the truthful interpolation
                      for monthly snapshots — balances change discretely at month boundaries. */}
                  {orderedDebts.map((d) => (
                    <Area
                      key={d.id}
                      type="stepAfter"
                      dataKey={d.id}
                      stackId="a"
                      stroke={d.color}
                      strokeWidth={1.5}
                      fill={`url(#grad-${d.id})`}
                      isAnimationActive={false}
                    />
                  ))}
                </ReAreaChart>
              </ResponsiveContainer>
            </div>

            <div className="flex flex-wrap gap-3 mt-2">
              {orderedDebts.map((d, i) => (
                <div key={d.id} className="flex items-center gap-1.5 text-xs">
                  <span className="size-2.5 rounded-full" style={{ background: d.color }} />
                  <span className="text-muted-foreground">
                    <span className="text-foreground/60 num mr-1">#{i + 1}</span>
                    {d.name}
                  </span>
                </div>
              ))}
            </div>
          </Card>

          {/* Controls */}
          <Card className="p-5 space-y-5">
            <div>
              <h3 className="font-semibold tracking-tight">Strategy</h3>
              <Tabs value={plan.strategy} onValueChange={(v) => setDebtPlan({ strategy: v as DebtStrategy })} className="mt-2">
                <TabsList className="grid grid-cols-3 w-full h-auto">
                  <TabsTrigger value="avalanche">Avalanche</TabsTrigger>
                  <TabsTrigger value="snowball">Snowball</TabsTrigger>
                  <TabsTrigger value="highest-balance">Biggest</TabsTrigger>
                </TabsList>
              </Tabs>
              <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{STRATEGY_DESC[plan.strategy]}</p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Extra per month</span>
                <div className="flex items-center gap-1">
                  <span className="text-muted-foreground text-xs">$</span>
                  <Input
                    type="number"
                    min={0}
                    value={plan.extraPerMonth}
                    onChange={(e) => setDebtPlan({ extraPerMonth: Math.max(0, Number(e.target.value) || 0) })}
                    className="w-20 h-7 text-sm num text-right"
                  />
                </div>
              </div>
              <Slider
                value={plan.extraPerMonth}
                onChange={(v) => setDebtPlan({ extraPerMonth: v })}
                min={0}
                max={2000}
                step={25}
              />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>$0</span>
                <span>$1,000</span>
                <span>$2,000</span>
              </div>
            </div>

            {/* Comparison */}
            <div>
              <h4 className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Compare</h4>
              <div className="space-y-1.5">
                {comparison.map((c) => {
                  const isCurrent = c.strategy === plan.strategy;
                  return (
                    <button
                      key={c.strategy}
                      onClick={() => setDebtPlan({ strategy: c.strategy })}
                      className={`w-full flex items-center gap-3 rounded-lg p-2.5 text-left transition-colors ${
                        isCurrent ? "bg-primary/10 border border-primary/30" : "hover:bg-accent/40"
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium">{STRATEGY_LABELS[c.strategy]}</div>
                        <div className="text-[11px] text-muted-foreground num">
                          {formatMonths(c.payoffMonth)} · {formatCurrency(c.totalInterest, { compact: true })} interest
                        </div>
                      </div>
                      {isCurrent && <span className="text-[10px] uppercase tracking-widest text-primary">Active</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          </Card>
        </div>

        {/* Underwater warning: minimums below monthly interest */}
        {underwaterDebts.length > 0 && (
          <Card className="p-4 border-warning/30 bg-warning/5">
            <div className="flex items-start gap-3">
              <div className="size-8 rounded-lg grid place-items-center bg-warning/15 text-warning shrink-0">
                <AlertTriangle className="size-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm">
                  {underwaterDebts.length === 1 ? "A debt" : `${underwaterDebts.length} debts`} can&apos;t keep up with interest
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                  The minimum payment is at or below the monthly interest, so without extra it would grow forever.
                  Throwing extra at it (avalanche style) is the only way to make progress.
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {underwaterDebts.map((d) => {
                    const monthlyInterest = (d.startingBalance * d.apr) / 100 / 12;
                    return (
                      <div key={d.id} className="text-[11px] rounded-md bg-card/60 border border-border px-2 py-1 num">
                        <span className="font-medium">{d.name}</span>
                        <span className="text-muted-foreground"> · min {formatCurrency(d.minimumPayment)} vs interest {formatCurrency(monthlyInterest)}/mo</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Per-debt schedule, in strategy priority order */}
        <Card className="p-5">
          <h3 className="font-semibold tracking-tight mb-1">Order &amp; payoff</h3>
          <p className="text-xs text-muted-foreground mb-4">
            Debts attacked first by the {STRATEGY_LABELS[plan.strategy]} strategy. Each row shows what happens with your current plan.
          </p>
          <LayoutGroup>
            <motion.ul className="space-y-2 list-none p-0 m-0">
              {orderedDebts.map((d, i) => {
                const lastMonth = result?.months[result.months.length - 1];
                const payoffM = result?.perAccountPayoffMonth[d.id];
                const interest = lastMonth?.byAccount[d.id]?.interest ?? 0;
                const totalPaid = lastMonth?.byAccount[d.id]?.paid ?? 0;
                const monthlyInterest = (d.startingBalance * d.apr) / 100 / 12;
                const isUnderwater = underwaterIds.includes(d.id);
                return (
                  <motion.li
                    key={d.id}
                    layout="position"
                    transition={{ type: "spring", stiffness: 380, damping: 32 }}
                    className="flex items-center gap-3 rounded-xl border border-border/60 bg-card/60 p-3"
                  >
                    <motion.div
                      layout="position"
                      className="size-9 rounded-lg grid place-items-center text-sm font-bold text-background shrink-0 shadow-sm"
                      style={{ background: d.color }}
                      aria-label={`Priority ${i + 1}`}
                    >
                      {i + 1}
                    </motion.div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium truncate">{d.name}</span>
                        {isUnderwater && <AlertTriangle className="size-3.5 text-warning shrink-0" aria-label="Minimum below interest" />}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        <span className="num">{formatCurrency(d.startingBalance)}</span> · {d.apr.toFixed(2)}% APR · min{" "}
                        <span className="num">{formatCurrency(d.minimumPayment)}</span>/mo
                        <span className="text-muted-foreground/70"> · interest <span className="num">{formatCurrency(monthlyInterest)}</span>/mo</span>
                      </div>
                    </div>
                    <div className="text-right text-sm shrink-0">
                      <div className="num font-medium">
                        {payoffM ? formatMonths(payoffM) : result?.hitCap ? "Never" : "—"}
                      </div>
                      <div className="text-[11px] text-muted-foreground num">
                        pay <span className="text-foreground">{formatCurrency(totalPaid, { compact: true })}</span> · interest{" "}
                        <span className="text-coral">{formatCurrency(interest, { compact: true })}</span>
                      </div>
                    </div>
                  </motion.li>
                );
              })}
            </motion.ul>
          </LayoutGroup>
          <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
            <ArrowDown className="size-3.5" /> Top of the list is attacked first. Switch strategy above to reorder.
          </div>
        </Card>
      </main>
    </>
  );
}

function HeroStat({
  icon: Icon,
  label,
  value,
  sublabel,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  sublabel?: string;
  color: string;
}) {
  return (
    <Card className="relative overflow-hidden p-4">
      <div className="absolute -top-10 -right-10 size-32 rounded-full opacity-20 blur-3xl" style={{ background: color }} />
      <div className="relative">
        <div
          className="size-8 rounded-lg grid place-items-center"
          style={{ background: `color-mix(in oklch, ${color} 18%, transparent)`, color }}
        >
          <Icon className="size-4" />
        </div>
        <div className="text-xs text-muted-foreground mt-3">{label}</div>
        <div className="text-xl font-semibold tracking-tight num">{value}</div>
        {sublabel && <div className="text-[11px] text-muted-foreground mt-0.5">{sublabel}</div>}
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
