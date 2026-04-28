"use client";

import * as React from "react";
import { motion, LayoutGroup } from "framer-motion";
import { Flame, TrendingDown, CalendarRange, DollarSign, Sparkles, ArrowDown, AlertTriangle, Wallet, ArrowRight, Check, History, TrendingUp } from "lucide-react";
import { Topbar } from "@/components/shell/topbar";
import { PageHeader } from "@/components/shell/page-header";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { useFinance } from "@/lib/store";
import {
  simulateDebtPayoff,
  compareStrategies,
  computeDebtPhases,
  orderDebts,
  actualPaymentsToDebt,
  monthBuckets,
  type DebtScheduleAccount,
} from "@/lib/finance";
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
  const transactions = useFinance((s) => s.transactions);
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

  // Phase breakdown: how much to pay on each debt right now, and how those amounts shift
  // every time a debt pays off. Each phase ends at a payoff event; the freed minimum
  // (plus the existing extra) rolls into the next target.
  const phases = React.useMemo(
    () => (result ? computeDebtPhases(debts, result, plan.strategy, plan.extraPerMonth, plan.customOrder) : []),
    [debts, result, plan.strategy, plan.extraPerMonth, plan.customOrder],
  );

  // Current-month payment per debt, surfaced inline on each row.
  const currentPayments = phases[0]?.payments ?? {};
  const monthlyBudget = totalMin + plan.extraPerMonth;

  // Last 4 calendar months including the current one. Used by "Payment tracking"
  // to compare what was *actually* paid (sum of incoming transfers) vs what the
  // plan called for. Predictions assume planned payments — months that fall short
  // mean the debt-free date in the chart is optimistic.
  const buckets = React.useMemo(() => monthBuckets(4), []);
  const actualsByDebt = React.useMemo(() => {
    const map: Record<string, number[]> = {};
    for (const d of debts) {
      map[d.id] = buckets.map((b) => actualPaymentsToDebt(d.id, transactions, b.start, b.end));
    }
    return map;
  }, [debts, transactions, buckets]);
  const currentMonthIdx = buckets.length - 1;
  const currentMonthShortfall = orderedDebts.reduce((sum, d) => {
    const planned = currentPayments[d.id] ?? 0;
    const paid = actualsByDebt[d.id]?.[currentMonthIdx] ?? 0;
    return sum + Math.max(0, planned - paid);
  }, 0);

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
        <main className="px-4 lg:px-8 py-6 max-w-[1400px] w-full mx-auto">
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
      <main className="px-4 lg:px-8 py-6 max-w-[1400px] w-full mx-auto space-y-6">
        <PageHeader title="Debt payoff" description="Plan a strategy, throw extra at debt, watch the timeline shrink." />

        {/* Hero stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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

        <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-6">
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
                <TabsList className="grid grid-cols-3 w-full h-auto text-xs sm:text-sm">
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

        {/* Payment plan: current month payments + how they cascade as debts pay off */}
        {phases.length > 0 && (
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-1">
              <Wallet className="size-4 text-primary" />
              <h3 className="font-semibold tracking-tight">What to pay each month</h3>
            </div>
            <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
              Your committed monthly outflow is{" "}
              <span className="num font-medium text-foreground">{formatCurrency(monthlyBudget)}</span>
              {plan.extraPerMonth > 0 && (
                <>
                  {" "}(<span className="num">{formatCurrency(totalMin)}</span> minimums +{" "}
                  <span className="num">{formatCurrency(plan.extraPerMonth)}</span> extra)
                </>
              )}
              . Keep paying that same total every month — when a debt pays off, redirect its money to the next target.
            </p>

            <ol className="space-y-3 list-none p-0 m-0">
              {phases.map((phase, idx) => {
                const target = orderedDebts.find((d) => d.id === phase.targetId);
                if (!target) return null;
                const isCurrent = idx === 0;
                const span = Math.max(1, phase.endMonth - phase.startMonth);
                const prevTarget = idx > 0 ? orderedDebts.find((d) => d.id === phases[idx - 1]?.targetId) : null;
                const targetPay = phase.payments[phase.targetId] ?? 0;
                const targetExtra = targetPay - target.minimumPayment;

                return (
                  <li key={idx} className="rounded-xl border border-border/60 bg-card/40 p-3">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-2">
                      <span
                        className={`text-[10px] uppercase tracking-widest font-medium ${
                          isCurrent ? "text-primary" : "text-muted-foreground"
                        }`}
                      >
                        {isCurrent ? "Right now" : prevTarget ? `After ${prevTarget.name} pays off` : `Phase ${idx + 1}`}
                      </span>
                      <span className="text-[10px] text-muted-foreground/70 num">
                        · {formatMonths(span)} · ends month {phase.endMonth}
                      </span>
                      <span className="ml-auto text-[11px] text-muted-foreground">
                        target:{" "}
                        <span className="font-medium text-foreground" style={{ color: target.color }}>
                          {target.name}
                        </span>
                      </span>
                    </div>

                    <ul className="space-y-1 list-none p-0 m-0">
                      {orderedDebts.map((d) => {
                        const pay = phase.payments[d.id];
                        if (pay === undefined) return null;
                        const isTarget = d.id === phase.targetId;
                        return (
                          <li
                            key={d.id}
                            className={`flex items-center gap-2.5 px-2 py-1.5 rounded-md ${
                              isTarget ? "bg-primary/8" : ""
                            }`}
                          >
                            <span className="size-2 rounded-full shrink-0" style={{ background: d.color }} />
                            <span
                              className={`flex-1 text-sm truncate ${
                                isTarget ? "font-medium" : "text-muted-foreground"
                              }`}
                            >
                              {d.name}
                            </span>
                            <span
                              className={`text-sm num tabular-nums ${
                                isTarget ? "font-semibold text-foreground" : "text-muted-foreground"
                              }`}
                            >
                              {formatCurrency(pay)}
                              <span className="text-[10px] text-muted-foreground/70 font-normal">/mo</span>
                            </span>
                          </li>
                        );
                      })}
                    </ul>

                    {targetExtra > 0.005 && (
                      <div className="mt-2 pt-2 border-t border-border/40 text-[11px] text-muted-foreground leading-relaxed">
                        <span className="font-medium text-foreground" style={{ color: target.color }}>
                          {target.name}
                        </span>{" "}
                        gets <span className="num">{formatCurrency(target.minimumPayment)}</span> own min
                        {phase.rolledFromIds.map((rid) => {
                          const r = orderedDebts.find((x) => x.id === rid);
                          if (!r) return null;
                          return (
                            <React.Fragment key={rid}>
                              {" "}+ <span className="num">{formatCurrency(r.minimumPayment)}</span>{" "}
                              <span className="text-muted-foreground/80">
                                from <span className="font-medium text-foreground/90" style={{ color: r.color }}>{r.name}</span>
                              </span>
                            </React.Fragment>
                          );
                        })}
                        {plan.extraPerMonth > 0.005 && (
                          <>
                            {" "}+ <span className="num">{formatCurrency(plan.extraPerMonth)}</span> extra
                          </>
                        )}
                        {" "}={" "}
                        <span className="num font-medium text-foreground">{formatCurrency(targetPay)}</span> total.
                      </div>
                    )}

                    {idx < phases.length - 1 && (
                      <div className="flex items-center justify-center gap-1.5 mt-2 -mb-1 text-[11px] text-muted-foreground">
                        <Check className="size-3 text-success" />
                        <span>
                          <span className="font-medium text-foreground" style={{ color: target.color }}>
                            {target.name}
                          </span>{" "}
                          paid off · its <span className="num">{formatCurrency(target.minimumPayment)}</span> min joins the rollover
                        </span>
                        <ArrowRight className="size-3" />
                        <span>
                          <span className="num">{formatCurrency(targetPay)}</span>/mo redirects
                        </span>
                      </div>
                    )}
                  </li>
                );
              })}
            </ol>
          </Card>
        )}

        {/* Payment tracking: actual paid each month vs planned, so the user can see
            whether the prediction above is being fed accurate inputs. */}
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-1">
            <History className="size-4 text-primary" />
            <h3 className="font-semibold tracking-tight">Payment tracking</h3>
          </div>
          <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
            What you actually paid each month, totaled from transfers into each debt account.
            {currentMonthShortfall > 0.005 ? (
              <>
                {" "}You&apos;re{" "}
                <span className="text-warning font-medium num">{formatCurrency(currentMonthShortfall)}</span> behind plan
                this month — predictions above assume the planned amounts.
              </>
            ) : (
              <> If actual ever falls below planned, the debt-free date above will slip.</>
            )}
          </p>

          <div className="overflow-x-auto -mx-1 px-1">
            <table className="w-full text-sm border-separate border-spacing-0">
              <thead>
                <tr className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  <th className="text-left font-medium pb-2 pr-3 sticky left-0 bg-card">Debt</th>
                  <th className="text-right font-medium pb-2 px-2 whitespace-nowrap">Planned</th>
                  {buckets.map((b) => (
                    <th key={b.key} className="text-right font-medium pb-2 px-2 whitespace-nowrap">
                      {b.isCurrent ? "This month" : b.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {orderedDebts.map((d) => {
                  const planned = currentPayments[d.id] ?? d.minimumPayment;
                  const series = actualsByDebt[d.id] ?? [];
                  const thisMonthPaid = series[currentMonthIdx] ?? 0;
                  const delta = thisMonthPaid - planned;
                  const onTrack = delta >= -0.005;
                  return (
                    <tr key={d.id} className="border-t border-border/40">
                      <td className="py-2 pr-3 sticky left-0 bg-card">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="size-2 rounded-full shrink-0" style={{ background: d.color }} />
                          <span className="truncate font-medium">{d.name}</span>
                        </div>
                      </td>
                      <td className="py-2 px-2 text-right num tabular-nums text-muted-foreground whitespace-nowrap">
                        {formatCurrency(planned)}
                      </td>
                      {series.map((amt, i) => {
                        const isCurrent = i === currentMonthIdx;
                        const cellDelta = amt - (isCurrent ? planned : d.minimumPayment);
                        const below = cellDelta < -0.005;
                        return (
                          <td
                            key={buckets[i].key}
                            className={`py-2 px-2 text-right num tabular-nums whitespace-nowrap ${
                              isCurrent ? "font-medium" : ""
                            } ${below ? "text-warning" : "text-foreground"}`}
                          >
                            {amt > 0 ? formatCurrency(amt) : <span className="text-muted-foreground/60">—</span>}
                            {isCurrent && amt > 0 && (
                              <div className={`text-[10px] font-normal ${onTrack ? "text-success" : "text-warning"}`}>
                                {onTrack
                                  ? delta > 0.005
                                    ? `+${formatCurrency(delta, { compact: true })}`
                                    : "on plan"
                                  : `−${formatCurrency(-delta, { compact: true })}`}
                              </div>
                            )}
                            {isCurrent && amt <= 0 && planned > 0.005 && (
                              <div className="text-[10px] font-normal text-warning">
                                −{formatCurrency(planned, { compact: true })}
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t border-border/60 text-xs">
                  <td className="py-2 pr-3 sticky left-0 bg-card text-muted-foreground uppercase tracking-widest text-[10px]">
                    Total
                  </td>
                  <td className="py-2 px-2 text-right num tabular-nums whitespace-nowrap font-medium">
                    {formatCurrency(monthlyBudget)}
                  </td>
                  {buckets.map((b, i) => {
                    const total = orderedDebts.reduce((s, d) => s + (actualsByDebt[d.id]?.[i] ?? 0), 0);
                    return (
                      <td
                        key={b.key}
                        className="py-2 px-2 text-right num tabular-nums whitespace-nowrap font-medium"
                      >
                        {total > 0 ? formatCurrency(total) : <span className="text-muted-foreground/60">—</span>}
                      </td>
                    );
                  })}
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="flex items-center gap-2 mt-3 text-[11px] text-muted-foreground">
            <TrendingUp className="size-3.5" />
            Counts transfers into each debt account. Log a transfer from your checking to a credit card to see it here.
          </div>
        </Card>

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
                const currentPay = currentPayments[d.id] ?? d.minimumPayment;
                const isCurrentTarget = phases[0]?.targetId === d.id;
                const extraOnTarget = isCurrentTarget ? Math.max(0, currentPay - d.minimumPayment) : 0;
                return (
                  <motion.li
                    key={d.id}
                    layout="position"
                    transition={{ type: "spring", stiffness: 380, damping: 32 }}
                    className={`flex items-center gap-3 rounded-xl border p-3 ${
                      isCurrentTarget ? "border-primary/40 bg-primary/5" : "border-border/60 bg-card/60"
                    }`}
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
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-medium truncate">{d.name}</span>
                        {isCurrentTarget && (
                          <span className="text-[9px] uppercase tracking-widest text-primary font-semibold px-1.5 py-0.5 rounded bg-primary/10">
                            target
                          </span>
                        )}
                        {isUnderwater && <AlertTriangle className="size-3.5 text-warning shrink-0" aria-label="Minimum below interest" />}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        <span className="num">{formatCurrency(d.startingBalance)}</span> · {d.apr.toFixed(2)}% APR · min{" "}
                        <span className="num">{formatCurrency(d.minimumPayment)}</span>/mo
                        <span className="text-muted-foreground/70"> · interest <span className="num">{formatCurrency(monthlyInterest)}</span>/mo</span>
                      </div>
                    </div>
                    <div className="text-right text-sm shrink-0">
                      <div className="num font-semibold tabular-nums">
                        {formatCurrency(currentPay)}
                        <span className="text-[10px] text-muted-foreground/70 font-normal">/mo</span>
                      </div>
                      <div className="text-[11px] text-muted-foreground num">
                        {extraOnTarget > 0.005 ? (
                          <>
                            min + <span className="text-foreground">{formatCurrency(extraOnTarget, { compact: true })}</span> extra
                          </>
                        ) : (
                          <>pay now · {payoffM ? `done in ${formatMonths(payoffM)}` : result?.hitCap ? "never" : "—"}</>
                        )}
                      </div>
                      <div className="text-[10px] text-muted-foreground/80 num mt-0.5">
                        total: <span className="text-foreground/80">{formatCurrency(totalPaid, { compact: true })}</span> · int{" "}
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
