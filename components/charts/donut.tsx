"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { formatCurrency } from "@/lib/format";

export interface DonutSlice {
  name: string;
  value: number;
  color: string;
}

export function Donut({
  data,
  centerLabel,
  centerValue,
  height = 220,
}: {
  data: DonutSlice[];
  centerLabel?: string;
  centerValue?: string;
  height?: number;
}) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  return (
    <div className="relative" style={{ height }}>
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={data}
            innerRadius="62%"
            outerRadius="92%"
            paddingAngle={2}
            dataKey="value"
            stroke="var(--background)"
            strokeWidth={2}
          >
            {data.map((d, i) => (
              <Cell key={i} fill={d.color} />
            ))}
          </Pie>
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const p = payload[0];
              const slice = p.payload as DonutSlice;
              const pct = total > 0 ? ((slice.value / total) * 100).toFixed(1) : "0";
              return (
                <div className="rounded-lg border border-border/70 bg-popover px-3 py-2 text-xs shadow-xl">
                  <div className="flex items-center gap-2">
                    <span className="size-2 rounded-full" style={{ background: slice.color }} />
                    <span className="font-medium">{slice.name}</span>
                  </div>
                  <div className="mt-1 font-mono tabular-nums">
                    {formatCurrency(slice.value)} <span className="text-muted-foreground">({pct}%)</span>
                  </div>
                </div>
              );
            }}
          />
        </PieChart>
      </ResponsiveContainer>
      {(centerLabel || centerValue) && (
        <div className="absolute inset-0 grid place-items-center pointer-events-none">
          <div className="text-center">
            {centerLabel && <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{centerLabel}</div>}
            {centerValue && <div className="text-2xl font-semibold tracking-tight num">{centerValue}</div>}
          </div>
        </div>
      )}
    </div>
  );
}
