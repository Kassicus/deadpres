"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  defaultSchedule,
  formatScheduleSummary,
  previewNext,
  WEEKDAY_NAMES,
  WEEKDAY_SHORT,
  type LastDayKind,
  type Schedule,
  type Weekday,
  type WeekendShift,
} from "@/lib/schedule";
import { formatDate } from "@/lib/format";

const KIND_LABELS: Record<Schedule["kind"], string> = {
  fixed: "Fixed cadence",
  weekday: "Specific weekday",
  "monthly-dates": "Days of month",
  "last-day": "Last day of month",
};

const KIND_DESC: Record<Schedule["kind"], string> = {
  fixed: "Daily, weekly, biweekly, monthly, quarterly, or yearly from a start date.",
  weekday: "Every Nth Friday (or any weekday) — perfect for biweekly paychecks.",
  "monthly-dates": "On specific dates each month, like the 1st & 15th.",
  "last-day": "On the last calendar day, last business day, or last [weekday] of each month.",
};

interface Props {
  value: Schedule;
  onChange: (s: Schedule) => void;
}

export function ScheduleEditor({ value, onChange }: Props) {
  const upcoming = React.useMemo(() => previewNext(value, 4), [value]);

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label>Schedule type</Label>
        <Select value={value.kind} onValueChange={(k) => onChange(scheduleForKind(k as Schedule["kind"], value))}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {(Object.keys(KIND_LABELS) as Schedule["kind"][]).map((k) => (
              <SelectItem key={k} value={k}>{KIND_LABELS[k]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-[11px] text-muted-foreground leading-relaxed">{KIND_DESC[value.kind]}</p>
      </div>

      {value.kind === "fixed" && (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Frequency</Label>
            <Select
              value={value.frequency}
              onValueChange={(f) => onChange({ ...value, frequency: f as typeof value.frequency })}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="biweekly">Every 2 weeks</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="quarterly">Quarterly</SelectItem>
                <SelectItem value="yearly">Yearly</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sched-anchor">First occurrence</Label>
            <Input
              id="sched-anchor"
              type="date"
              value={isoDateInput(value.anchor)}
              onChange={(e) => onChange({ ...value, anchor: dateToIso(e.target.value) })}
            />
          </div>
        </div>
      )}

      {value.kind === "weekday" && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="sched-weekday-n">Every</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="sched-weekday-n"
                  type="number"
                  min={1}
                  max={12}
                  value={value.everyNWeeks}
                  onChange={(e) => onChange({ ...value, everyNWeeks: Math.max(1, Number(e.target.value) || 1) })}
                  className="w-16 num text-center"
                />
                <span className="text-sm text-muted-foreground">{value.everyNWeeks === 1 ? "week" : "weeks"}</span>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sched-anchor-w">Starting</Label>
              <Input
                id="sched-anchor-w"
                type="date"
                value={isoDateInput(value.anchor)}
                onChange={(e) => onChange({ ...value, anchor: dateToIso(e.target.value) })}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>On</Label>
            <div className="grid grid-cols-7 gap-1.5">
              {WEEKDAY_SHORT.map((label, i) => {
                const wd = i as Weekday;
                const active = value.weekday === wd;
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => onChange({ ...value, weekday: wd })}
                    className={cn(
                      "py-2 rounded-lg text-xs font-medium transition-all border",
                      active
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border bg-card text-muted-foreground hover:text-foreground hover:bg-accent/50",
                    )}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {value.kind === "monthly-dates" && (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Days of month</Label>
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => {
                const active = value.dates.includes(day);
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => {
                      const next = active
                        ? value.dates.filter((d) => d !== day)
                        : [...value.dates, day].sort((a, b) => a - b);
                      onChange({ ...value, dates: next });
                    }}
                    className={cn(
                      "py-1.5 rounded-md text-xs font-medium transition-all border",
                      active
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border bg-card text-muted-foreground hover:text-foreground hover:bg-accent/50",
                    )}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-muted-foreground">
              For months without that day (e.g. Feb 30), it shifts to the last day of the month.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label>If it falls on a weekend</Label>
            <Select
              value={value.weekendShift}
              onValueChange={(s) => onChange({ ...value, weekendShift: s as WeekendShift })}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Keep weekend date</SelectItem>
                <SelectItem value="friday">Pay Friday before</SelectItem>
                <SelectItem value="monday">Pay Monday after</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {value.kind === "last-day" && (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Type</Label>
            <Select
              value={value.type}
              onValueChange={(t) =>
                onChange({
                  kind: "last-day",
                  type: t as LastDayKind,
                  weekday: t === "weekday" ? value.weekday ?? 5 : undefined,
                })
              }
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="calendar">Last calendar day</SelectItem>
                <SelectItem value="business">Last business day</SelectItem>
                <SelectItem value="weekday">Last [weekday]</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {value.type === "weekday" && (
            <div className="space-y-1.5">
              <Label>Weekday</Label>
              <Select
                value={String(value.weekday ?? 5)}
                onValueChange={(v) => onChange({ ...value, weekday: Number(v) as Weekday })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {WEEKDAY_NAMES.map((n, i) => (
                    <SelectItem key={i} value={String(i)}>{n}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      )}

      <div className="rounded-xl border border-border/60 bg-card/40 p-3">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground uppercase tracking-widest text-[10px]">Next 4 occurrences</span>
          <span className="text-[11px] text-foreground/80">{formatScheduleSummary(value)}</span>
        </div>
        <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-1.5">
          {upcoming.map((d, i) => (
            <div key={i} className="rounded-md bg-card border border-border/60 px-2 py-1.5 text-center">
              <div className="text-[10px] text-muted-foreground">{WEEKDAY_SHORT[d.getDay()]}</div>
              <div className="text-xs font-medium num">{formatDate(d, "short")}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function isoDateInput(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10);
}

function dateToIso(yyyymmdd: string): string {
  return new Date(`${yyyymmdd}T00:00:00`).toISOString();
}

function scheduleForKind(kind: Schedule["kind"], current: Schedule): Schedule {
  const anchor = "anchor" in current ? current.anchor : new Date().toISOString();
  switch (kind) {
    case "fixed":
      return { kind: "fixed", frequency: "monthly", anchor };
    case "weekday":
      return { kind: "weekday", weekday: 5, everyNWeeks: 2, anchor };
    case "monthly-dates":
      return { kind: "monthly-dates", dates: [1, 15], weekendShift: "friday" };
    case "last-day":
      return { kind: "last-day", type: "business" };
  }
}

export { defaultSchedule };
