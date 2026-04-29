import type { Account, DebtStrategy, RecurrenceFrequency, RecurringDirection, RecurringPayment, Transaction } from "./types";
import { approxMonthlyCount } from "./schedule";

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

/**
 * Monthly-equivalent total of a recurring payment, derived from its schedule.
 * Returned positive regardless of direction.
 */
export function monthlyAmount(item: RecurringPayment): number {
  return item.amount * approxMonthlyCount(item.schedule);
}

export function monthlyRecurringTotal(items: RecurringPayment[], direction?: RecurringDirection): number {
  return items
    .filter((s) => s.active)
    .filter((s) => (direction ? s.direction === direction : true))
    .reduce((sum, s) => sum + monthlyAmount(s), 0);
}

/** Net monthly recurring (income − expense) across active scheduled payments. */
export function monthlyRecurringNet(items: RecurringPayment[]): number {
  return monthlyRecurringTotal(items, "income") - monthlyRecurringTotal(items, "expense");
}

/** True for credit cards and loans — accounts whose balance the user reconciles manually. */
export function isUserManagedBalance(account: Pick<Account, "type">): boolean {
  return account.type === "credit" || account.type === "loan";
}

/**
 * Count transactions touching a user-managed account that landed since the last
 * balance reconciliation. Used to surface a "stale — N transactions since last update"
 * indicator on credit cards and loans.
 */
export function transactionsSinceBalanceUpdate(account: Account, txs: Transaction[]): Transaction[] {
  const since = new Date(account.balanceUpdatedAt).getTime();
  return txs.filter((t) => {
    if (t.accountId !== account.id && t.toAccountId !== account.id) return false;
    return new Date(t.date).getTime() > since;
  });
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
  /** 0 means already debt-free; payoffMonth === maxMonths means simulation hit cap. */
  payoffMonth: number;
  /** True if a debt's minimum payment is less than (or equal to) its monthly interest. */
  hitCap: boolean;
  totalInterest: number;
  totalPaid: number;
  perAccountPayoffMonth: Record<string, number>;
  /** Debts whose minimum payment can't cover the monthly interest. */
  debtsBelowInterest: string[];
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

export interface SimulateOptions {
  /**
   * Snowball/avalanche behavior: when a debt is paid off, its freed minimum
   * stays in the budget and rolls into the next priority debt. Default true.
   * Set false for a true "minimums-only" baseline where freed mins are not redirected.
   */
  rolloverFreedMinimums?: boolean;
  maxMonths?: number;
}

export function simulateDebtPayoff(
  debts: DebtScheduleAccount[],
  strategy: DebtStrategy,
  extraPerMonth: number,
  customOrder?: string[],
  options: SimulateOptions = {},
): DebtScheduleResult {
  const { rolloverFreedMinimums = true, maxMonths = 600 } = options;
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

  // Initial committed budget. For rollover strategies this is the user's promise:
  // pay all minimums plus extra every month, regardless of how many debts remain.
  const initialMinimumsTotal = ordered.reduce((s, d) => s + d.minimumPayment, 0);
  const monthlyBudget = initialMinimumsTotal + extraPerMonth;

  // Detect debts whose min can't keep up with monthly interest — they grow forever
  // unless extra/rollover bails them out.
  const debtsBelowInterest = ordered
    .filter((d) => {
      const monthlyInterest = d.startingBalance * (d.apr / 100 / 12);
      return d.minimumPayment > 0 && d.minimumPayment <= monthlyInterest;
    })
    .map((d) => d.id);

  const months: DebtMonth[] = [];
  const startDate = new Date();
  startDate.setDate(1);
  months.push(snapshot(0, startDate, ordered, balances, paidPerAccount, interestPerAccount));

  let monthIndex = 0;
  while (monthIndex < maxMonths) {
    const stillOwes = ordered.filter((d) => balances[d.id] > 0.005);
    if (stillOwes.length === 0) break;

    monthIndex++;

    // 1) Accrue monthly interest on each debt with a remaining balance.
    //    APR / 12 is a standard simplification (true periodic billing varies by lender).
    for (const d of ordered) {
      if (balances[d.id] <= 0) continue;
      const monthlyRate = d.apr / 100 / 12;
      const interest = balances[d.id] * monthlyRate;
      balances[d.id] += interest;
      interestPerAccount[d.id] += interest;
    }

    // 2) Pay each active debt its minimum (capped at remaining balance).
    let budgetSpent = 0;
    for (const d of ordered) {
      if (balances[d.id] <= 0) continue;
      const min = Math.min(d.minimumPayment, balances[d.id]);
      balances[d.id] -= min;
      paidPerAccount[d.id] += min;
      budgetSpent += min;
    }

    // 3) Cascade the leftover budget to debts in priority order.
    //    With rollover (default): leftover = (initialMins + extra) − minsPaidThisMonth.
    //    As debts die, fewer mins are spent, more flows into the cascade pool — that's
    //    the snowball / avalanche effect.
    //    Without rollover: leftover = extraPerMonth, regardless of how many debts remain.
    let availableExtra = rolloverFreedMinimums
      ? Math.max(0, monthlyBudget - budgetSpent)
      : extraPerMonth;

    for (const d of ordered) {
      if (availableExtra <= 0) break;
      if (balances[d.id] <= 0) continue;
      const apply = Math.min(availableExtra, balances[d.id]);
      balances[d.id] -= apply;
      paidPerAccount[d.id] += apply;
      availableExtra -= apply;
    }

    // 4) Mark payoffs.
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
    hitCap: monthIndex >= maxMonths,
    totalInterest: round(totalInterest),
    totalPaid: round(totalPaid),
    perAccountPayoffMonth: payoffMonths,
    debtsBelowInterest,
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

/* ---------- Actual payments tracking (vs the plan) ---------- */

export interface MonthBucket {
  /** YYYY-MM key for stable map lookups. */
  key: string;
  /** First instant of the month. */
  start: Date;
  /** Last instant of the month (23:59:59.999). */
  end: Date;
  /** Short human label, e.g. "Apr 2026". */
  label: string;
  /** True for the calendar month containing `anchor`. */
  isCurrent: boolean;
}

/** Most-recent-last list of N month buckets ending at `anchor`'s calendar month. */
export function monthBuckets(monthsBack: number, anchor = new Date()): MonthBucket[] {
  const out: MonthBucket[] = [];
  const labelFmt = new Intl.DateTimeFormat(undefined, { month: "short", year: "numeric" });
  for (let i = monthsBack - 1; i >= 0; i--) {
    const start = new Date(anchor.getFullYear(), anchor.getMonth() - i, 1);
    const end = new Date(anchor.getFullYear(), anchor.getMonth() - i + 1, 0, 23, 59, 59, 999);
    out.push({
      key: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}`,
      start,
      end,
      label: labelFmt.format(start),
      isCurrent: i === 0,
    });
  }
  return out;
}

/**
 * Sum of payments toward a credit/loan account in [start, end]. Counts
 * transfers whose destination is the debt account — that's the canonical
 * "I paid the card" record in this app's data model. Charges (expenses on
 * the card) are NOT counted; they grow the balance, not pay it down.
 */
export function actualPaymentsToDebt(
  debtId: string,
  txs: Transaction[],
  start: Date,
  end: Date,
): number {
  let total = 0;
  const lo = start.getTime();
  const hi = end.getTime();
  for (const t of txs) {
    if (t.type !== "transfer") continue;
    if (t.toAccountId !== debtId) continue;
    const td = new Date(t.date).getTime();
    if (td >= lo && td <= hi) total += t.amount;
  }
  return round(total);
}

/* ---------- Payment phases (what to pay each month, by phase) ---------- */

export interface DebtPhase {
  /** Month this phase begins (0 = current month). */
  startMonth: number;
  /** Month at which `endingId` finishes — phase ends here. */
  endMonth: number;
  /** Active target debt for this phase: receives all rollover + extra. */
  targetId: string;
  /**
   * The debt that pays off at `endMonth` (closes this phase). May or may
   * not equal `targetId`: when a smaller debt pays off naturally from its
   * own minimum, the target stays the same and only this `endingId` changes.
   */
  endingId: string;
  /** Per-debt monthly payment during this phase. Omits debts already paid off. */
  payments: Record<string, number>;
  /** Sum of `payments` — the user's total monthly outflow this phase. */
  total: number;
  /**
   * Debts paid off before this phase started, in payoff order. Their minimum
   * payments now flow into the target — each one is a named line in the
   * target's payment breakdown.
   */
  rolledFromIds: string[];
}

/**
 * Break the schedule into discrete phases bounded by debt payoffs. Within a phase,
 * each non-target debt pays its minimum and the target absorbs the rollover —
 * which is exactly the "after this card dies, the money flows here" picture the
 * user needs when planning month-to-month payments.
 */
export function computeDebtPhases(
  debts: DebtScheduleAccount[],
  result: DebtScheduleResult,
  strategy: DebtStrategy,
  extraPerMonth: number,
  customOrder?: string[],
): DebtPhase[] {
  if (debts.length === 0) return [];
  const ordered = orderDebts(debts, strategy, customOrder);
  const monthlyBudget = ordered.reduce((s, d) => s + d.minimumPayment, 0) + extraPerMonth;

  const events = ordered
    .map((d) => ({ id: d.id, payoffMonth: result.perAccountPayoffMonth[d.id] }))
    .filter((e): e is { id: string; payoffMonth: number } => typeof e.payoffMonth === "number")
    .sort((a, b) => a.payoffMonth - b.payoffMonth);

  const phases: DebtPhase[] = [];
  const active = new Set(ordered.map((d) => d.id));
  const rolledFromIds: string[] = [];
  let phaseStart = 0;

  for (const event of events) {
    const target = ordered.find((d) => active.has(d.id));
    if (!target) break;

    const otherMinSum = ordered
      .filter((d) => active.has(d.id) && d.id !== target.id)
      .reduce((s, d) => s + d.minimumPayment, 0);
    const targetPayment = Math.max(target.minimumPayment, monthlyBudget - otherMinSum);

    const payments: Record<string, number> = {};
    let total = 0;
    for (const d of ordered) {
      if (!active.has(d.id)) continue;
      const pay = d.id === target.id ? targetPayment : d.minimumPayment;
      payments[d.id] = round(pay);
      total += pay;
    }

    phases.push({
      startMonth: phaseStart,
      endMonth: event.payoffMonth,
      targetId: target.id,
      endingId: event.id,
      payments,
      total: round(total),
      rolledFromIds: [...rolledFromIds],
    });

    active.delete(event.id);
    rolledFromIds.push(event.id);
    phaseStart = event.payoffMonth;
  }

  return phases;
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
