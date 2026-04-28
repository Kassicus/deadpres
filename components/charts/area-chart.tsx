"use client";

import * as React from "react";
import {
  AreaChart as ReAreaChart,
  Area,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { formatCurrency } from "@/lib/format";

interface Series {
  key: string;
  label: string;
  color: string;
}

export function AreaChart<T extends Record<string, unknown>>({
  data,
  series,
  xKey,
  formatX,
  height = 220,
  showAxis = true,
  formatY = (v: number) => formatCurrency(v, { compact: true }),
}: {
  data: T[];
  series: Series[];
  xKey: keyof T & string;
  formatX?: (v: T[keyof T]) => string;
  height?: number;
  showAxis?: boolean;
  formatY?: (v: number) => string;
}) {
  const id = React.useId();
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ReAreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          {series.map((s) => (
            <linearGradient key={s.key} id={`${id}-${s.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={s.color} stopOpacity={0.45} />
              <stop offset="100%" stopColor={s.color} stopOpacity={0} />
            </linearGradient>
          ))}
        </defs>
        {showAxis && (
          <CartesianGrid stroke="var(--border)" strokeOpacity={0.5} vertical={false} />
        )}
        {showAxis && (
          <XAxis
            dataKey={xKey}
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            tickLine={false}
            axisLine={false}
            tickFormatter={formatX as (v: unknown) => string}
          />
        )}
        {showAxis && (
          <YAxis
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => formatY(v)}
            width={60}
          />
        )}
        <Tooltip
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
                      <span className="size-2 rounded-full" style={{ background: s?.color }} />
                      <span>{s?.label}</span>
                      <span className="ml-auto font-mono tabular-nums text-foreground">
                        {formatY(p.value as number)}
                      </span>
                    </div>
                  );
                })}
              </div>
            );
          }}
        />
        {series.map((s) => (
          <Area
            key={s.key}
            type="monotone"
            dataKey={s.key}
            stroke={s.color}
            strokeWidth={2}
            fill={`url(#${id}-${s.key})`}
          />
        ))}
      </ReAreaChart>
    </ResponsiveContainer>
  );
}
