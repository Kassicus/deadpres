const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

const compactFormatter = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
});

const compactCurrencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 1,
});

const percentFormatter = new Intl.NumberFormat("en-US", {
  style: "percent",
  maximumFractionDigits: 2,
});

export function formatCurrency(value: number, opts?: { compact?: boolean; signed?: boolean }) {
  const fmt = opts?.compact ? compactCurrencyFormatter : currencyFormatter;
  const formatted = fmt.format(Math.abs(value));
  if (opts?.signed) {
    if (value > 0) return `+${formatted}`;
    if (value < 0) return `−${formatted}`;
  }
  return value < 0 ? `−${formatted}` : formatted;
}

export function formatCompact(value: number) {
  return compactFormatter.format(value);
}

export function formatPercent(value: number) {
  return percentFormatter.format(value);
}

export function formatDate(date: string | Date, format: "short" | "long" | "month" = "short") {
  const d = typeof date === "string" ? new Date(date) : date;
  if (format === "long") {
    return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
  }
  if (format === "month") {
    return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
  }
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function formatRelative(date: string | Date) {
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days === -1) return "Tomorrow";
  if (days > 0 && days < 7) return `${days}d ago`;
  if (days < 0 && days > -14) return `in ${Math.abs(days)}d`;
  return formatDate(d, "short");
}
