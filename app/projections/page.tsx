"use client";

import * as React from "react";
import { TrendingUp, Sparkles, ChevronUp } from "lucide-react";
import { Topbar } from "@/components/shell/topbar";
import { PageHeader } from "@/components/shell/page-header";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { projectGrowth } from "@/lib/finance";
import { formatCurrency, formatPercent } from "@/lib/format";
import { useFinance } from "@/lib/store";
import {
  AreaChart as ReAreaChart,
  Area,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { netWorth } from "@/lib/finance";

export default function ProjectionsPage() {
  const accounts = useFinance((s) => s.accounts);

  const investmentBalance = accounts.filter((a) => a.type === "investment").reduce((s, a) => s + a.balance, 0);
  const savingsBalance = accounts.filter((a) => a.type === "savings").reduce((s, a) => s + a.balance, 0);
  const { total } = netWorth(accounts);

  const [starting, setStarting] = React.useState(0);
  const [contribution, setContribution] = React.useState(500);
  const [rate, setRate] = React.useState(7);
  const [years, setYears] = React.useState(20);
  const [preset, setPreset] = React.useState<"investment" | "savings" | "networth" | "custom">("investment");

  React.useEffect(() => {
    if (preset === "investment") setStarting(Math.round(investmentBalance));
    else if (preset === "savings") setStarting(Math.round(savingsBalance));
    else if (preset === "networth") setStarting(Math.round(total));
  }, [preset, investmentBalance, savingsBalance, total]);

  const points = React.useMemo(
    () =>
      projectGrowth({
        startingBalance: starting,
        monthlyContribution: contribution,
        annualRatePercent: rate,
        months: years * 12,
      }),
    [starting, contribution, rate, years],
  );

  const final = points[points.length - 1];
  const totalContrib = final.contributions;
  const totalInterest = final.interest;
  const finalBalance = final.balance;
  const growthMultiple = totalContrib > 0 ? finalBalance / totalContrib : 0;

  return (
    <>
      <Topbar title="Projections" description="See where your money could grow." />
      <main className="px-4 lg:px-8 py-6 max-w-[1400px] w-full space-y-6">
        <PageHeader
          title="Growth projections"
          description="Run what-ifs on your savings and investments. Compound interest is your best friend."
        />

        <Tabs value={preset} onValueChange={(v) => setPreset(v as typeof preset)}>
          <TabsList>
            <TabsTrigger value="investment">From investments</TabsTrigger>
            <TabsTrigger value="savings">From savings</TabsTrigger>
            <TabsTrigger value="networth">From net worth</TabsTrigger>
            <TabsTrigger value="custom">Custom</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6">
          {/* Controls */}
          <Card className="p-5 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="starting">Starting balance</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                <Input
                  id="starting"
                  type="number"
                  step={100}
                  className="pl-7 num text-lg font-semibold h-11"
                  value={starting}
                  onChange={(e) => setStarting(Number(e.target.value) || 0)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Monthly contribution</Label>
                <span className="text-sm font-medium num">{formatCurrency(contribution)}</span>
              </div>
              <Slider value={contribution} onChange={setContribution} min={0} max={5000} step={50} />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Annual return</Label>
                <span className="text-sm font-medium num">{rate.toFixed(1)}%</span>
              </div>
              <Slider value={rate} onChange={setRate} min={0} max={15} step={0.1} />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>HYSA ~4%</span>
                <span>S&P avg 7-10%</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Time horizon</Label>
                <span className="text-sm font-medium num">{years} {years === 1 ? "year" : "years"}</span>
              </div>
              <Slider value={years} onChange={setYears} min={1} max={50} step={1} />
            </div>

            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm">
              <div className="text-[11px] uppercase tracking-widest text-muted-foreground">Projected balance</div>
              <div className="text-3xl font-semibold tracking-tight num text-primary mt-1">{formatCurrency(finalBalance)}</div>
              <div className="text-xs text-muted-foreground mt-1">
                in {years} {years === 1 ? "year" : "years"} · {growthMultiple.toFixed(1)}× contributions
              </div>
            </div>
          </Card>

          {/* Chart */}
          <Card className="p-5">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h3 className="font-semibold tracking-tight">Compound growth</h3>
                <p className="text-xs text-muted-foreground">
                  Contributions vs interest earned over time
                </p>
              </div>
              <div className="flex flex-wrap gap-3 text-xs">
                <Stat label="Contributions" value={formatCurrency(totalContrib, { compact: true })} dotColor="var(--mint)" />
                <Stat label="Interest" value={formatCurrency(totalInterest, { compact: true })} dotColor="var(--violet)" />
                <Stat label="Total" value={formatCurrency(finalBalance, { compact: true })} dotColor="var(--primary)" />
              </div>
            </div>

            <div className="mt-4 h-[360px]">
              <ResponsiveContainer>
                <ReAreaChart data={points} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="grad-contrib" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--mint)" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="var(--mint)" stopOpacity={0.05} />
                    </linearGradient>
                    <linearGradient id="grad-balance" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--violet)" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="var(--violet)" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="var(--border)" strokeOpacity={0.5} vertical={false} />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(m: number) => (m % 12 === 0 ? `${m / 12}y` : "")}
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
                      const yrs = (label as number) / 12;
                      return (
                        <div className="rounded-lg border border-border/70 bg-popover px-3 py-2 text-xs shadow-xl">
                          <div className="font-medium mb-1">Year {yrs.toFixed(1)}</div>
                          {payload.map((p) => (
                            <div key={String(p.dataKey)} className="flex items-center gap-2 text-muted-foreground">
                              <span className="capitalize">{String(p.dataKey)}</span>
                              <span className="ml-auto font-mono tabular-nums text-foreground">
                                {formatCurrency(p.value as number)}
                              </span>
                            </div>
                          ))}
                        </div>
                      );
                    }}
                  />
                  <Area type="monotone" dataKey="contributions" stroke="var(--mint)" strokeWidth={2} fill="url(#grad-contrib)" />
                  <Area type="monotone" dataKey="balance" stroke="var(--violet)" strokeWidth={2.5} fill="url(#grad-balance)" />
                </ReAreaChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        {/* Insight cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <InsightCard
            icon={Sparkles}
            title="Power of compounding"
            description={`Every dollar you put in turns into ${growthMultiple.toFixed(1)}× by year ${years}.`}
            color="var(--violet)"
          />
          <InsightCard
            icon={ChevronUp}
            title="Bump it up"
            description={`+$100/mo gets you ~${formatCurrency(extraScenario(starting, contribution + 100, rate, years), { compact: true })} — a ${formatPercent(extraScenario(starting, contribution + 100, rate, years) / finalBalance - 1)} bump.`}
            color="var(--mint)"
          />
          <InsightCard
            icon={TrendingUp}
            title="Time in market"
            description={`Wait 5 more years and you'd land near ${formatCurrency(extraScenario(starting, contribution, rate, years + 5), { compact: true })}.`}
            color="var(--coral)"
          />
        </div>
      </main>
    </>
  );
}

function Stat({ label, value, dotColor }: { label: string; value: string; dotColor: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="size-2 rounded-full" style={{ background: dotColor }} />
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium num">{value}</span>
    </div>
  );
}

function InsightCard({
  icon: Icon,
  title,
  description,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  color: string;
}) {
  return (
    <Card className="p-4 relative overflow-hidden">
      <div className="absolute -top-8 -right-8 size-24 rounded-full opacity-20 blur-2xl" style={{ background: color }} />
      <div className="relative">
        <div
          className="size-8 rounded-lg grid place-items-center"
          style={{ background: `color-mix(in oklch, ${color} 18%, transparent)`, color }}
        >
          <Icon className="size-4" />
        </div>
        <div className="font-medium mt-3">{title}</div>
        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{description}</p>
      </div>
    </Card>
  );
}

function extraScenario(starting: number, contribution: number, rate: number, years: number): number {
  const r = projectGrowth({
    startingBalance: starting,
    monthlyContribution: contribution,
    annualRatePercent: rate,
    months: years * 12,
  });
  return r[r.length - 1].balance;
}
