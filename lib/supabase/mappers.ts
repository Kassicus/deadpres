import type { Database } from "./database.types";
import type {
  Account,
  AccountColor,
  AccountType,
  DebtPlan,
  RecurrenceFrequency,
  RecurringDirection,
  RecurringPayment,
  SavingsGoal,
  Transaction,
  TransactionType,
} from "@/lib/types";
import type { Schedule } from "@/lib/schedule";

type AccountRow = Database["public"]["Tables"]["accounts"]["Row"];
type AccountInsert = Database["public"]["Tables"]["accounts"]["Insert"];
type TransactionRow = Database["public"]["Tables"]["transactions"]["Row"];
type TransactionInsert = Database["public"]["Tables"]["transactions"]["Insert"];
type RecurringPaymentRow = Database["public"]["Tables"]["recurring_payments"]["Row"];
type RecurringPaymentInsert = Database["public"]["Tables"]["recurring_payments"]["Insert"];
type GoalRow = Database["public"]["Tables"]["savings_goals"]["Row"];
type GoalInsert = Database["public"]["Tables"]["savings_goals"]["Insert"];
type DebtPlanRow = Database["public"]["Tables"]["debt_plans"]["Row"];

const toNum = (v: number | string | null | undefined): number => {
  if (v === null || v === undefined) return 0;
  return typeof v === "string" ? Number(v) : v;
};

const toNumOrUndefined = (v: number | string | null | undefined): number | undefined => {
  if (v === null || v === undefined) return undefined;
  return typeof v === "string" ? Number(v) : v;
};

/* ---------- Accounts ---------- */

export function rowToAccount(r: AccountRow): Account {
  return {
    id: r.id,
    name: r.name,
    type: r.type as AccountType,
    balance: toNum(r.balance),
    creditLimit: toNumOrUndefined(r.credit_limit),
    apr: toNumOrUndefined(r.apr),
    minimumPayment: toNumOrUndefined(r.minimum_payment),
    payoffDate: r.payoff_date ?? undefined,
    institution: r.institution ?? undefined,
    color: r.color as AccountColor,
    icon: r.icon ?? undefined,
    notes: r.notes ?? undefined,
    archived: r.archived,
    createdAt: r.created_at,
  };
}

export function accountToInsert(a: Omit<Account, "id" | "createdAt">, userId: string): AccountInsert {
  return {
    user_id: userId,
    name: a.name,
    type: a.type,
    balance: a.balance,
    credit_limit: a.creditLimit ?? null,
    apr: a.apr ?? null,
    minimum_payment: a.minimumPayment ?? null,
    payoff_date: a.payoffDate ?? null,
    institution: a.institution ?? null,
    color: a.color,
    icon: a.icon ?? null,
    notes: a.notes ?? null,
    archived: a.archived ?? false,
  };
}

export function accountToUpdate(patch: Partial<Account>): Database["public"]["Tables"]["accounts"]["Update"] {
  const u: Database["public"]["Tables"]["accounts"]["Update"] = {};
  if (patch.name !== undefined) u.name = patch.name;
  if (patch.type !== undefined) u.type = patch.type;
  if (patch.balance !== undefined) u.balance = patch.balance;
  if (patch.creditLimit !== undefined) u.credit_limit = patch.creditLimit ?? null;
  if (patch.apr !== undefined) u.apr = patch.apr ?? null;
  if (patch.minimumPayment !== undefined) u.minimum_payment = patch.minimumPayment ?? null;
  if (patch.payoffDate !== undefined) u.payoff_date = patch.payoffDate ?? null;
  if (patch.institution !== undefined) u.institution = patch.institution ?? null;
  if (patch.color !== undefined) u.color = patch.color;
  if (patch.icon !== undefined) u.icon = patch.icon ?? null;
  if (patch.notes !== undefined) u.notes = patch.notes ?? null;
  if (patch.archived !== undefined) u.archived = patch.archived;
  return u;
}

/* ---------- Transactions ---------- */

export function rowToTransaction(r: TransactionRow): Transaction {
  return {
    id: r.id,
    accountId: r.account_id,
    toAccountId: r.to_account_id ?? undefined,
    amount: toNum(r.amount),
    type: r.type as TransactionType,
    category: r.category,
    merchant: r.merchant ?? undefined,
    notes: r.notes ?? undefined,
    date: r.date,
    pending: r.pending,
    createdAt: r.created_at,
  };
}

export function transactionToInsert(t: Omit<Transaction, "id" | "createdAt">, userId: string): TransactionInsert {
  return {
    user_id: userId,
    account_id: t.accountId,
    to_account_id: t.toAccountId ?? null,
    amount: t.amount,
    type: t.type,
    category: t.category,
    merchant: t.merchant ?? null,
    notes: t.notes ?? null,
    date: t.date,
    pending: t.pending ?? false,
  };
}

export function transactionToUpdate(patch: Partial<Transaction>): Database["public"]["Tables"]["transactions"]["Update"] {
  const u: Database["public"]["Tables"]["transactions"]["Update"] = {};
  if (patch.accountId !== undefined) u.account_id = patch.accountId;
  if (patch.toAccountId !== undefined) u.to_account_id = patch.toAccountId ?? null;
  if (patch.amount !== undefined) u.amount = patch.amount;
  if (patch.type !== undefined) u.type = patch.type;
  if (patch.category !== undefined) u.category = patch.category;
  if (patch.merchant !== undefined) u.merchant = patch.merchant ?? null;
  if (patch.notes !== undefined) u.notes = patch.notes ?? null;
  if (patch.date !== undefined) u.date = patch.date;
  if (patch.pending !== undefined) u.pending = patch.pending;
  return u;
}

/* ---------- Recurring payments ---------- */

export function rowToRecurringPayment(r: RecurringPaymentRow): RecurringPayment {
  return {
    id: r.id,
    name: r.name,
    amount: toNum(r.amount),
    direction: r.direction as RecurringDirection,
    schedule: r.schedule as Schedule,
    category: r.category,
    accountId: r.account_id ?? undefined,
    nextChargeDate: r.next_charge_date,
    startDate: r.start_date,
    active: r.active,
    notes: r.notes ?? undefined,
    color: r.color as AccountColor,
    icon: r.icon ?? undefined,
    postedThrough: r.posted_through ?? undefined,
    createdAt: r.created_at,
  };
}

export function recurringPaymentToInsert(s: Omit<RecurringPayment, "id" | "createdAt">, userId: string): RecurringPaymentInsert {
  return {
    user_id: userId,
    name: s.name,
    amount: s.amount,
    direction: s.direction,
    schedule: s.schedule,
    category: s.category,
    account_id: s.accountId ?? null,
    next_charge_date: s.nextChargeDate,
    start_date: s.startDate,
    active: s.active,
    notes: s.notes ?? null,
    color: s.color,
    icon: s.icon ?? null,
    posted_through: s.postedThrough ?? null,
  };
}

export function recurringPaymentToUpdate(patch: Partial<RecurringPayment>): Database["public"]["Tables"]["recurring_payments"]["Update"] {
  const u: Database["public"]["Tables"]["recurring_payments"]["Update"] = {};
  if (patch.name !== undefined) u.name = patch.name;
  if (patch.amount !== undefined) u.amount = patch.amount;
  if (patch.direction !== undefined) u.direction = patch.direction;
  if (patch.schedule !== undefined) u.schedule = patch.schedule;
  if (patch.category !== undefined) u.category = patch.category;
  if (patch.accountId !== undefined) u.account_id = patch.accountId ?? null;
  if (patch.nextChargeDate !== undefined) u.next_charge_date = patch.nextChargeDate;
  if (patch.startDate !== undefined) u.start_date = patch.startDate;
  if (patch.active !== undefined) u.active = patch.active;
  if (patch.notes !== undefined) u.notes = patch.notes ?? null;
  if (patch.postedThrough !== undefined) u.posted_through = patch.postedThrough ?? null;
  if (patch.color !== undefined) u.color = patch.color;
  if (patch.icon !== undefined) u.icon = patch.icon ?? null;
  return u;
}

/* ---------- Goals ---------- */

export function rowToGoal(r: GoalRow): SavingsGoal {
  return {
    id: r.id,
    name: r.name,
    targetAmount: toNum(r.target_amount),
    currentAmount: toNum(r.current_amount),
    targetDate: r.target_date ?? undefined,
    accountId: r.account_id ?? undefined,
    monthlyContribution: toNumOrUndefined(r.monthly_contribution),
    color: r.color as AccountColor,
    icon: r.icon ?? undefined,
    createdAt: r.created_at,
  };
}

export function goalToInsert(g: Omit<SavingsGoal, "id" | "createdAt">, userId: string): GoalInsert {
  return {
    user_id: userId,
    name: g.name,
    target_amount: g.targetAmount,
    current_amount: g.currentAmount,
    target_date: g.targetDate ?? null,
    account_id: g.accountId ?? null,
    monthly_contribution: g.monthlyContribution ?? null,
    color: g.color,
    icon: g.icon ?? null,
  };
}

export function goalToUpdate(patch: Partial<SavingsGoal>): Database["public"]["Tables"]["savings_goals"]["Update"] {
  const u: Database["public"]["Tables"]["savings_goals"]["Update"] = {};
  if (patch.name !== undefined) u.name = patch.name;
  if (patch.targetAmount !== undefined) u.target_amount = patch.targetAmount;
  if (patch.currentAmount !== undefined) u.current_amount = patch.currentAmount;
  if (patch.targetDate !== undefined) u.target_date = patch.targetDate ?? null;
  if (patch.accountId !== undefined) u.account_id = patch.accountId ?? null;
  if (patch.monthlyContribution !== undefined) u.monthly_contribution = patch.monthlyContribution ?? null;
  if (patch.color !== undefined) u.color = patch.color;
  if (patch.icon !== undefined) u.icon = patch.icon ?? null;
  return u;
}

/* ---------- Debt plan ---------- */

export function rowToDebtPlan(r: DebtPlanRow): DebtPlan {
  return {
    strategy: r.strategy,
    extraPerMonth: toNum(r.extra_per_month),
    customOrder: r.custom_order ?? undefined,
  };
}
