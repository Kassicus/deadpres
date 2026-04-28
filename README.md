# Pocket — Money OS

A fun, modern personal finance command center. Next.js 16 + React 19 + Tailwind v4. Privacy-first: your data lives in your browser, no backend, ready to deploy on Vercel.

## Features

- **Dashboard** — Net worth, account tiles, cashflow, spending breakdown, recent activity, upcoming bills, debt overview, savings progress.
- **Accounts** — Checking, savings, credit cards, loans, investments. APR, credit limit, utilization, color picker.
- **Transactions** — Add/search/filter expenses, income, transfers. Day grouping, category icons.
- **Subscriptions** — Track recurring charges by frequency (daily → yearly), donut breakdown, monthly/yearly totals, pause/resume.
- **Debt Payoff** — Avalanche, Snowball, Biggest-first strategies. Adjustable extra/month. Stacked payoff timeline. Side-by-side strategy comparison with interest savings.
- **Savings Goals** — Targets, monthly contributions, projected time-to-goal, quick contribution form.
- **Projections** — Compound interest calculator with sliders for contribution, return, and time horizon.

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000 — click **Load demo data** on the welcome banner to explore with sample numbers, or jump straight to **Add transaction** / **New account**.

## Deploy on Vercel

```bash
vercel
```

No env vars needed — everything runs client-side with `localStorage` persistence.

## Stack

- Next.js 16 App Router (Turbopack)
- React 19, TypeScript
- Tailwind CSS v4
- Radix UI primitives + custom shadcn-style components
- Zustand (with `persist` middleware for `localStorage`)
- Recharts for visualizations
- Lucide for icons
- Sonner for toasts

## Where things live

```
app/                 # Next.js routes (one folder per page)
components/
  ui/                # Button, Card, Dialog, Select, Tabs, Slider, etc.
  shell/             # Sidebar, mobile nav, topbar, page header
  charts/            # Area, bar, donut wrappers around Recharts
  dashboard/         # Per-tile dashboard widgets
  accounts/          # Account card + dialog
  transactions/      # Row + add dialog
  subscriptions/     # Subscription dialog
  savings/           # Goal dialog
lib/
  store.ts           # Zustand store (accounts, transactions, subscriptions, goals, debt plan)
  finance.ts         # Net worth, cashflow, debt payoff sim, compound interest
  seed.ts            # Demo data
  types.ts           # Shared types
  categories.ts      # Default categories
  colors.ts          # Color palette helpers
  format.ts          # Currency / date formatters
  icons.ts           # Lucide icon registry
```
