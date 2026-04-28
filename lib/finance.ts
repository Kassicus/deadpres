import type { Account, DebtStrategy, RecurrenceFrequency, Subscription, Transaction } from "./types";

/* ---------- Recurrence helpers ---------- */

export function frequencyPerYear(freq: RecurrenceFrequency): number {
  switch (freq) {
    case "daily": return 365;
    case "weekly": return 52;
    case "biweekly": return 26;
    case "monthly": return 12;
    case "quarterly": return 4;
    case "yearly": return 1;
  }
}

export function monthlyEquivalent(amount: number, freq: RecurrenceFrequency): number {
  return (amount * frequencyPerYear(freq)) / 12;
}

export function yearlyEquivalent(amount: number, freq: RecurrenceFrequency): number {
  return amount * frequencyPerYear(freq);
}

export function nextChargeDate(start: Date, freq: RecurrenceFrequency, from = new Date()): Date {
  const d = new Date(start);
  while (d.getTime() <= from.getTime()) {
    advanceDate(d, freq);
  }
  return d;
}

export function advanceDate(d: Date, freq: RecurrenceFrequency): Date {
  switch (freq) {
    case "daily": d.setDate(d.getDate() + 1); break;
    case "weekly": d.setDate(d.getDate() + 7); break;
    case "biweekly": d.setDate(d.getDate() + 14); break;
    case "monthly": d.setMonth(d.getMonth() + 1); break;
    case "quarterly": d.setMonth(d.getMonth() + 3); break;
    case "yearly": d.setFullYear(d.getFullYear() + 1); break;
  }
  return d;
}

/* ---------- Net worth ---------- */

export function accountSignedBalance(a: Account): number {
  if (a.archived) return 0;
  if (a.type === "credit" || a.type === "loan") return -a.balance;
  return a.balance;
}

export function netWorth(accounts: Account[]): { assets: number; liabilities: number; total: number } {
  let assets = 0;
  let liabilities = 0;
  for (const a of accounts) {
    if (a.archived) continue;
    if (a.type === "credit" || a.type === "loan") liabilities += a.balance;
    else assets += a.balance;
  }
  return { assets, liabilities, total: assets - liabilities };
}

/* ---------- Cashflow ---------- */

export function monthBoundary(d = new Date()): { start: Date; end: Date } {
  const start = new Date(d.getFullYear(), d.getMonth(), 1);
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
  return { start, end };
}

export function transactionsInRange(txs: Transaction[], start: Date, end: Date): Transaction[] {
  return txs.filter((t) => {
    const td = new Date(t.date).getTime();
    return td >= start.getTime() && td <= end.getTime();
  });
}

export function cashflow(txs: Transaction[]): { income: number; expense: number; net: number } {
  let income = 0;
  let expense = 0;
  for (const t of txs) {
    if (t.type === "income") income += t.amount;
    else if (t.type === "expense") expense += t.amount;
  }
  return { income, expense, net: income - expense };
}

export function monthlySubscriptionsTotal(subs: Subscription[]): number {
  return subs
    .filter((s) => s.active)
    .reduce((sum, s) => sum + monthlyEquivalent(s.amount, s.frequency), 0);
}

/* ---------- Compound interest / projections ---------- */

export interface ProjectionPoint {
  month: number;
  date: string;
  balance: number;
  contributions: number;
  interest: number;
}

export interface ProjectionInput {
  startingBalance: number;
  monthlyContribution: number;
  /** annual rate as percentage e.g. 7 for 7% */
  annualRatePercent: number;
  months: number;
  /** compounds per year */
  compoundFrequency?: number;
}

export function projectGrowth({
  startingBalance,
  monthlyContribution,
  annualRatePercent,
  months,
  compoundFrequency = 12,
}: ProjectionInput): ProjectionPoint[] {
  const r = annualRatePercent / 100;
  const monthlyRate = Math.pow(1 + r / compoundFrequency, compoundFrequency / 12) - 1;

  const out: ProjectionPoint[] = [];
  let balance = startingBalance;
  let contributions = startingBalance;
  let interest = 0;

  const start = new Date();
  start.setDate(1);

  for (let m = 0; m <= months; m++) {
    if (m > 0) {
      const monthInterest = balance * monthlyRate;
      interest += monthInterest;
      balance += monthInterest + monthlyContribution;
      contributions += monthlyContribution;
    }
    const d = new Date(start);
    d.setMonth(d.getMonth() + m);
    out.push({
      month: m,
      date: d.toISOString(),
      balance: round(balance),
      contributions: round(contributions),
      interest: round(interest),
    });
  }
  return out;
}

/* ---------- Debt payoff (snowball / avalanche / etc) ---------- */

export interface DebtScheduleAccount {
  id: string;
  name: string;
  startingBalance: number;
  apr: number;
  minimumPayment: number;
  color: string;
}

export interface DebtMonth {
  month: number;
  date: string;
  totalBalance: number;
  totalPaid: number;
  totalInterest: number;
  byAccount: Record<string, { balance: number; paid: number; interest: number }>;
}

export interface DebtScheduleResult {
  months: DebtMonth[];
  payoffMonth: number;
  totalInterest: number;
  totalPaid: number;
  perAccountPayoffMonth: Record<string, number>;
}

export function orderDebts(debts: DebtScheduleAccount[], strategy: DebtStrategy, customOrder?: string[]): DebtScheduleAccount[] {
  if (strategy === "custom" && customOrder?.length) {
    const map = new Map(debts.map((d) => [d.id, d]));
    const ordered: DebtScheduleAccount[] = [];
    for (const id of customOrder) {
      const found = map.get(id);
      if (found) ordered.push(found);
    }
    for (const d of debts) {
      if (!customOrder.includes(d.id)) ordered.push(d);
    }
    return ordered;
  }
  const arr = [...debts];
  if (strategy === "avalanche") arr.sort((a, b) => b.apr - a.apr);
  else if (strategy === "snowball") arr.sort((a, b) => a.startingBalance - b.startingBalance);
  else if (strategy === "highest-balance") arr.sort((a, b) => b.startingBalance - a.startingBalance);
  return arr;
}

export function simulateDebtPayoff(
  debts: DebtScheduleAccount[],
  strategy: DebtStrategy,
  extraPerMonth: number,
  customOrder?: string[],
  maxMonths = 600,
): DebtScheduleResult {
  const ordered = orderDebts(debts, strategy, customOrder);
  const balances: Record<string, number> = {};
  const paidPerAccount: Record<string, number> = {};
  const interestPerAccount: Record<string, number> = {};
  const payoffMonths: Record<string, number> = {};

  for (const d of ordered) {
    balances[d.id] = d.startingBalance;
    paidPerAccount[d.id] = 0;
    interestPerAccount[d.id] = 0;
  }

  const months: DebtMonth[] = [];

  // Month 0 snapshot
  const startDate = new Date();
  startDate.setDate(1);
  months.push(snapshot(0, startDate, ordered, balances, paidPerAccount, interestPerAccount));

  let monthIndex = 0;
  while (monthIndex < maxMonths) {
    const stillOwes = ordered.filter((d) => balances[d.id] > 0.005);
    if (stillOwes.length === 0) break;

    monthIndex++;

    // 1) Accrue monthly interest
    for (const d of ordered) {
      if (balances[d.id] <= 0) continue;
      const monthlyRate = d.apr / 100 / 12;
      const interest = balances[d.id] * monthlyRate;
      balances[d.id] += interest;
      interestPerAccount[d.id] += interest;
    }

    // 2) Apply minimum payments to all
    let availableExtra = extraPerMonth;
    for (const d of ordered) {
      if (balances[d.id] <= 0) continue;
      const min = Math.min(d.minimumPayment, balances[d.id]);
      balances[d.id] -= min;
      paidPerAccount[d.id] += min;
    }

    // 3) Apply extra to first non-zero in priority order; cascade overflow
    for (const d of ordered) {
      if (availableExtra <= 0) break;
      if (balances[d.id] <= 0) continue;
      const apply = Math.min(availableExtra, balances[d.id]);
      balances[d.id] -= apply;
      paidPerAccount[d.id] += apply;
      availableExtra -= apply;
    }

    // 4) Track payoffs
    for (const d of ordered) {
      if (payoffMonths[d.id] === undefined && balances[d.id] <= 0.005) {
        payoffMonths[d.id] = monthIndex;
      }
    }

    const date = new Date(startDate);
    date.setMonth(date.getMonth() + monthIndex);
    months.push(snapshot(monthIndex, date, ordered, balances, paidPerAccount, interestPerAccount));
  }

  let totalInterest = 0;
  let totalPaid = 0;
  for (const d of ordered) {
    totalInterest += interestPerAccount[d.id];
    totalPaid += paidPerAccount[d.id];
  }

  return {
    months,
    payoffMonth: monthIndex,
    totalInterest: round(totalInterest),
    totalPaid: round(totalPaid),
    perAccountPayoffMonth: payoffMonths,
  };
}

function snapshot(
  month: number,
  date: Date,
  debts: DebtScheduleAccount[],
  balances: Record<string, number>,
  paid: Record<string, number>,
  interest: Record<string, number>,
): DebtMonth {
  const byAccount: DebtMonth["byAccount"] = {};
  let totalBalance = 0;
  let totalPaid = 0;
  let totalInterest = 0;
  for (const d of debts) {
    const b = Math.max(0, balances[d.id]);
    byAccount[d.id] = { balance: round(b), paid: round(paid[d.id]), interest: round(interest[d.id]) };
    totalBalance += b;
    totalPaid += paid[d.id];
    totalInterest += interest[d.id];
  }
  return {
    month,
    date: date.toISOString(),
    totalBalance: round(totalBalance),
    totalPaid: round(totalPaid),
    totalInterest: round(totalInterest),
    byAccount,
  };
}

/* ---------- Compare strategies ---------- */

export interface StrategyComparison {
  strategy: DebtStrategy;
  payoffMonth: number;
  totalInterest: number;
  totalPaid: number;
}

export function compareStrategies(
  debts: DebtScheduleAccount[],
  extraPerMonth: number,
  customOrder?: string[],
): StrategyComparison[] {
  const strategies: DebtStrategy[] = ["avalanche", "snowball", "highest-balance"];
  if (customOrder?.length) strategies.push("custom");
  return strategies.map((s) => {
    const r = simulateDebtPayoff(debts, s, extraPerMonth, customOrder);
    return {
      strategy: s,
      payoffMonth: r.payoffMonth,
      totalInterest: r.totalInterest,
      totalPaid: r.totalPaid,
    };
  });
}

/* ---------- Savings goal projection ---------- */

export function monthsToGoal(current: number, target: number, monthlyContribution: number, annualRate = 0): number {
  if (current >= target) return 0;
  if (monthlyContribution <= 0 && annualRate <= 0) return Infinity;

  const r = annualRate / 100 / 12;
  let balance = current;
  let m = 0;
  while (balance < target && m < 1200) {
    balance = balance * (1 + r) + monthlyContribution;
    m++;
  }
  return m >= 1200 ? Infinity : m;
}

/* ---------- Helpers ---------- */

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
