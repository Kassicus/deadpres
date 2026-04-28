"use client";

import {
  BarChart as ReBarChart,
  Bar,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
  Cell,
} from "recharts";
import { formatCurrency } from "@/lib/format";

interface Series {
  key: string;
  label: string;
  color: string;
}

export function BarChart<T extends Record<string, unknown>>({
  data,
  series,
  xKey,
  height = 220,
  stacked = false,
  formatX,
  cellColors,
}: {
  data: T[];
  series: Series[];
  xKey: keyof T & string;
  height?: number;
  stacked?: boolean;
  formatX?: (v: T[keyof T]) => string;
  cellColors?: string[];
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ReBarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid stroke="var(--border)" strokeOpacity={0.5} vertical={false} />
        <XAxis
          dataKey={xKey}
          tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
          tickLine={false}
          axisLine={false}
          tickFormatter={formatX as (v: unknown) => string}
        />
        <YAxis
          tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => formatCurrency(v as number, { compact: true })}
          width={60}
        />
        <Tooltip
          cursor={{ fill: "color-mix(in oklch, var(--accent) 50%, transparent)" }}
          content={({ active, payload, label }) => {
            if (!active || !payload?.length) return null;
            return (
              <div className="rounded-lg border border-border/70 bg-popover px-3 py-2 text-xs shadow-xl">
                <div className="font-medium mb-1 text-popover-foreground">
                  {formatX ? formatX(label as T[keyof T]) : (label as string)}
                </div>
                {payload.map((p) => {
                  const s = series.find((x) => x.key === p.dataKey);
                  return (
                    <div key={String(p.dataKey)} className="flex items-center gap-2 text-muted-foreground">
                      <span className="size-2 rounded-sm" style={{ background: s?.color }} />
                      <span>{s?.label}</span>
                      <span className="ml-auto font-mono tabular-nums text-foreground">
                        {formatCurrency(p.value as number)}
                      </span>
                    </div>
                  );
                })}
              </div>
            );
          }}
        />
        {series.map((s) => (
          <Bar
            key={s.key}
            dataKey={s.key}
            stackId={stacked ? "a" : undefined}
            fill={s.color}
            radius={stacked ? 0 : [6, 6, 0, 0]}
          >
            {cellColors &&
              data.map((_, i) => <Cell key={i} fill={cellColors[i % cellColors.length]} />)}
          </Bar>
        ))}
      </ReBarChart>
    </ResponsiveContainer>
  );
}
