import type { AccountColor } from "./types";

export const ACCOUNT_COLORS: AccountColor[] = [
  "violet",
  "mint",
  "coral",
  "amber",
  "sky",
  "rose",
  "lime",
  "stone",
];

export const COLOR_VAR: Record<AccountColor, string> = {
  violet: "var(--violet)",
  mint: "var(--mint)",
  coral: "var(--coral)",
  amber: "var(--amber)",
  sky: "var(--sky)",
  rose: "oklch(0.74 0.18 0)",
  lime: "oklch(0.82 0.18 130)",
  stone: "oklch(0.6 0.02 80)",
};

export const COLOR_HEX: Record<AccountColor, string> = {
  violet: "#a78bfa",
  mint: "#5eead4",
  coral: "#fb7185",
  amber: "#fbbf24",
  sky: "#7dd3fc",
  rose: "#f472b6",
  lime: "#bef264",
  stone: "#a8a29e",
};

export function colorBg(c: AccountColor, alpha = 0.15): string {
  return `color-mix(in oklch, ${COLOR_VAR[c]} ${alpha * 100}%, transparent)`;
}

export function colorText(c: AccountColor): string {
  return COLOR_VAR[c];
}
