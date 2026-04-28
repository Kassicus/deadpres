import type { RecurrenceFrequency } from "./types";

/* ---------- Schedule type ---------- */

export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6; // Sunday = 0
export type WeekendShift = "friday" | "monday" | "none";
export type LastDayKind = "calendar" | "business" | "weekday";

export type Schedule =
  | { kind: "fixed"; frequency: RecurrenceFrequency; anchor: string /* ISO date */ }
  | { kind: "weekday"; weekday: Weekday; everyNWeeks: number; anchor: string }
  | { kind: "monthly-dates"; dates: number[]; weekendShift: WeekendShift }
  | { kind: "last-day"; type: LastDayKind; weekday?: Weekday };

export const WEEKDAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
export const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/* ---------- Date math helpers ---------- */

const MS_DAY = 86_400_000;
const MS_WEEK = MS_DAY * 7;

function startOfDay(d: Date): Date {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  return out;
}

function addDays(d: Date, n: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
}

function addMonths(d: Date, n: number): Date {
  const out = new Date(d);
  out.setMonth(out.getMonth() + n);
  return out;
}

function lastDayOfMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function clampDateToMonth(year: number, month: number, day: number): Date {
  const last = lastDayOfMonth(year, month);
  return new Date(year, month, Math.min(day, last));
}

function applyWeekendShift(d: Date, shift: WeekendShift): Date {
  if (shift === "none") return d;
  const wd = d.getDay();
  if (wd === 6) return shift === "friday" ? addDays(d, -1) : addDays(d, 2); // Saturday
  if (wd === 0) return shift === "friday" ? addDays(d, -2) : addDays(d, 1); // Sunday
  return d;
}

function priorBusinessDay(d: Date): Date {
  let cursor = new Date(d);
  while (cursor.getDay() === 0 || cursor.getDay() === 6) {
    cursor = addDays(cursor, -1);
  }
  return cursor;
}

function lastWeekdayOfMonth(year: number, month: number, weekday: Weekday): Date {
  const last = lastDayOfMonth(year, month);
  for (let day = last; day >= 1; day--) {
    const d = new Date(year, month, day);
    if (d.getDay() === weekday) return d;
  }
  return new Date(year, month, last);
}

/* ---------- nextOccurrence ---------- */

/**
 * Returns the next occurrence at or after `from`. Always returns a date.
 * If you need to skip the current day, pass tomorrow.
 */
export function nextOccurrence(schedule: Schedule, from: Date = new Date()): Date {
  const cursor = startOfDay(from);

  switch (schedule.kind) {
    case "fixed":
      return nextFixed(schedule, cursor);
    case "weekday":
      return nextWeekday(schedule, cursor);
    case "monthly-dates":
      return nextMonthlyDates(schedule, cursor);
    case "last-day":
      return nextLastDay(schedule, cursor);
  }
}

function nextFixed(s: Extract<Schedule, { kind: "fixed" }>, from: Date): Date {
  const anchor = startOfDay(new Date(s.anchor));
  if (anchor.getTime() >= from.getTime()) return anchor;

  const stepDays = (() => {
    switch (s.frequency) {
      case "daily": return 1;
      case "weekly": return 7;
      case "biweekly": return 14;
      default: return 0;
    }
  })();

  if (stepDays > 0) {
    const diff = Math.ceil((from.getTime() - anchor.getTime()) / (stepDays * MS_DAY));
    return addDays(anchor, diff * stepDays);
  }

  // monthly / quarterly / yearly: walk months
  const monthStep = s.frequency === "monthly" ? 1 : s.frequency === "quarterly" ? 3 : 12;
  let cursor = anchor;
  while (cursor.getTime() < from.getTime()) {
    cursor = addMonths(cursor, monthStep);
  }
  return cursor;
}

function nextWeekday(s: Extract<Schedule, { kind: "weekday" }>, from: Date): Date {
  const interval = Math.max(1, s.everyNWeeks);
  let anchor = startOfDay(new Date(s.anchor));
  // Snap anchor to the configured weekday at or after the supplied anchor.
  const anchorWd = anchor.getDay();
  const offset = (s.weekday - anchorWd + 7) % 7;
  anchor = addDays(anchor, offset);

  if (anchor.getTime() >= from.getTime()) return anchor;
  const weeksSince = (from.getTime() - anchor.getTime()) / MS_WEEK;
  const cycles = Math.ceil(weeksSince / interval);
  return addDays(anchor, cycles * interval * 7);
}

function nextMonthlyDates(s: Extract<Schedule, { kind: "monthly-dates" }>, from: Date): Date {
  const sortedDates = [...new Set(s.dates)].filter((d) => d >= 1 && d <= 31);
  if (sortedDates.length === 0) return from;

  const candidates = (year: number, month: number): Date[] =>
    sortedDates
      .map((day) => applyWeekendShift(clampDateToMonth(year, month, day), s.weekendShift))
      .sort((a, b) => a.getTime() - b.getTime());

  for (let monthOffset = -1; monthOffset <= 24; monthOffset++) {
    const probe = addMonths(from, monthOffset);
    for (const c of candidates(probe.getFullYear(), probe.getMonth())) {
      if (c.getTime() >= from.getTime()) return c;
    }
  }
  return from;
}

function nextLastDay(s: Extract<Schedule, { kind: "last-day" }>, from: Date): Date {
  for (let monthOffset = 0; monthOffset <= 24; monthOffset++) {
    const probe = addMonths(from, monthOffset);
    const year = probe.getFullYear();
    const month = probe.getMonth();
    let candidate: Date;

    if (s.type === "calendar") {
      candidate = new Date(year, month, lastDayOfMonth(year, month));
    } else if (s.type === "business") {
      candidate = priorBusinessDay(new Date(year, month, lastDayOfMonth(year, month)));
    } else {
      candidate = lastWeekdayOfMonth(year, month, s.weekday ?? 5);
    }

    if (candidate.getTime() >= from.getTime()) return candidate;
  }
  return from;
}

/* ---------- Multi-occurrence helpers ---------- */

export function previewNext(schedule: Schedule, count: number, from: Date = new Date()): Date[] {
  const out: Date[] = [];
  let cursor = from;
  for (let i = 0; i < count; i++) {
    const next = nextOccurrence(schedule, cursor);
    out.push(next);
    cursor = addDays(next, 1);
  }
  return out;
}

export function occurrencesBetween(schedule: Schedule, from: Date, to: Date, max = 200): Date[] {
  const out: Date[] = [];
  let cursor = from;
  while (out.length < max) {
    const next = nextOccurrence(schedule, cursor);
    if (next.getTime() > to.getTime()) break;
    out.push(next);
    cursor = addDays(next, 1);
  }
  return out;
}

export function occurrencesPerMonth(schedule: Schedule): number {
  const start = new Date();
  const end = addMonths(start, 12);
  return occurrencesBetween(schedule, start, end).length / 12;
}

/* ---------- Display ---------- */

const ORDINAL = ["1st","2nd","3rd","4th","5th","6th","7th","8th","9th","10th","11th","12th","13th","14th","15th","16th","17th","18th","19th","20th","21st","22nd","23rd","24th","25th","26th","27th","28th","29th","30th","31st"];

function ordinal(n: number): string {
  return ORDINAL[n - 1] ?? `${n}th`;
}

export function formatScheduleSummary(schedule: Schedule): string {
  switch (schedule.kind) {
    case "fixed":
      switch (schedule.frequency) {
        case "daily": return "Daily";
        case "weekly": return "Weekly";
        case "biweekly": return "Every 2 weeks";
        case "monthly": return "Monthly";
        case "quarterly": return "Quarterly";
        case "yearly": return "Yearly";
      }
    // eslint-disable-next-line no-fallthrough
    case "weekday": {
      const day = WEEKDAY_NAMES[schedule.weekday];
      if (schedule.everyNWeeks === 1) return `Every ${day}`;
      if (schedule.everyNWeeks === 2) return `Every other ${day}`;
      return `Every ${schedule.everyNWeeks} weeks on ${day}`;
    }
    case "monthly-dates": {
      const dates = [...new Set(schedule.dates)].sort((a, b) => a - b);
      const label = dates.map(ordinal).join(" & ");
      const shift = schedule.weekendShift === "friday"
        ? " (weekends → Fri)"
        : schedule.weekendShift === "monday"
          ? " (weekends → Mon)"
          : "";
      return dates.length === 1 ? `${label} of each month${shift}` : `${label} of each month${shift}`;
    }
    case "last-day": {
      if (schedule.type === "calendar") return "Last day of each month";
      if (schedule.type === "business") return "Last business day";
      return `Last ${WEEKDAY_NAMES[schedule.weekday ?? 5]} of each month`;
    }
  }
}

/* ---------- Defaults / serialization ---------- */

export function defaultSchedule(): Schedule {
  return { kind: "fixed", frequency: "monthly", anchor: new Date().toISOString() };
}

/** Approximate occurrences-per-month so we can compute monthly totals across schedule kinds. */
export function approxMonthlyCount(schedule: Schedule): number {
  switch (schedule.kind) {
    case "fixed":
      switch (schedule.frequency) {
        case "daily": return 30;
        case "weekly": return 52 / 12;
        case "biweekly": return 26 / 12;
        case "monthly": return 1;
        case "quarterly": return 1 / 3;
        case "yearly": return 1 / 12;
      }
    // eslint-disable-next-line no-fallthrough
    case "weekday":
      return (52 / 12) / Math.max(1, schedule.everyNWeeks);
    case "monthly-dates":
      return new Set(schedule.dates).size;
    case "last-day":
      return 1;
  }
}
