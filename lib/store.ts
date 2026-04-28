"use client";

import { create } from "zustand";
import type { Account, DebtPlan, RecurringPayment, SavingsGoal, Transaction } from "./types";
import { createClient } from "./supabase/client";
import {
  accountToInsert,
  accountToUpdate,
  goalToInsert,
  goalToUpdate,
  recurringPaymentToInsert,
  recurringPaymentToUpdate,
  rowToAccount,
  rowToDebtPlan,
  rowToGoal,
  rowToRecurringPayment,
  rowToTransaction,
  transactionToInsert,
  transactionToUpdate,
} from "./supabase/mappers";
import { toast } from "sonner";

interface FinanceState {
  hydrated: boolean;
  loading: boolean;
  userId: string | null;
  accounts: Account[];
  transactions: Transaction[];
  recurringPayments: RecurringPayment[];
  goals: SavingsGoal[];
  debtPlan: DebtPlan;

  setHydrated: (b: boolean) => void;
  loadAll: (userId: string) => Promise<void>;
  clear: () => void;

  addAccount: (a: Omit<Account, "id" | "createdAt" | "balanceUpdatedAt">) => Promise<Account | null>;
  updateAccount: (id: string, patch: Partial<Account>) => Promise<void>;
  removeAccount: (id: string) => Promise<void>;

  addTransaction: (t: Omit<Transaction, "id" | "createdAt">) => Promise<Transaction | null>;
  updateTransaction: (id: string, patch: Partial<Transaction>) => Promise<void>;
  removeTransaction: (id: string) => Promise<void>;

  addRecurringPayment: (s: Omit<RecurringPayment, "id" | "createdAt">) => Promise<RecurringPayment | null>;
  updateRecurringPayment: (id: string, patch: Partial<RecurringPayment>) => Promise<void>;
  removeRecurringPayment: (id: string) => Promise<void>;

  addGoal: (g: Omit<SavingsGoal, "id" | "createdAt">) => Promise<SavingsGoal | null>;
  updateGoal: (id: string, patch: Partial<SavingsGoal>) => Promise<void>;
  removeGoal: (id: string) => Promise<void>;

  setDebtPlan: (p: Partial<DebtPlan>) => Promise<void>;
}

const DEFAULT_PLAN: DebtPlan = {
  strategy: "avalanche",
  extraPerMonth: 0,
};

export const useFinance = create<FinanceState>()((set, get) => ({
  hydrated: false,
  loading: false,
  userId: null,
  accounts: [],
  transactions: [],
  recurringPayments: [],
  goals: [],
  debtPlan: DEFAULT_PLAN,

  setHydrated: (b) => set({ hydrated: b }),

  clear: () =>
    set({
      userId: null,
      accounts: [],
      transactions: [],
      recurringPayments: [],
      goals: [],
      debtPlan: DEFAULT_PLAN,
      hydrated: false,
    }),

  loadAll: async (userId: string) => {
    if (get().loading) return;
    set({ loading: true });
    const supabase = createClient();

    const [accountsRes, txRes, recRes, goalsRes, planRes] = await Promise.all([
      supabase.from("accounts").select("*").order("created_at", { ascending: true }),
      supabase.from("transactions").select("*").order("date", { ascending: false }),
      supabase.from("recurring_payments").select("*").order("next_charge_date", { ascending: true }),
      supabase.from("savings_goals").select("*").order("created_at", { ascending: true }),
      supabase.from("debt_plans").select("*").eq("user_id", userId).maybeSingle(),
    ]);

    const errors = [accountsRes.error, txRes.error, recRes.error, goalsRes.error, planRes.error].filter(Boolean);
    if (errors.length) {
      toast.error("Couldn't load your data — try refreshing.");
      console.error("loadAll errors", errors);
      set({ loading: false });
      return;
    }

    set({
      userId,
      accounts: (accountsRes.data ?? []).map(rowToAccount),
      transactions: (txRes.data ?? []).map(rowToTransaction),
      recurringPayments: (recRes.data ?? []).map(rowToRecurringPayment),
      goals: (goalsRes.data ?? []).map(rowToGoal),
      debtPlan: planRes.data ? rowToDebtPlan(planRes.data) : DEFAULT_PLAN,
      hydrated: true,
      loading: false,
    });
  },

  /* ---------- Accounts ---------- */

  addAccount: async (a) => {
    const userId = get().userId;
    if (!userId) return null;
    const supabase = createClient();
    const { data, error } = await supabase
      .from("accounts")
      .insert(accountToInsert(a, userId))
      .select()
      .single();
    if (error || !data) {
      toast.error(error?.message ?? "Couldn't add account");
      return null;
    }
    const account = rowToAccount(data);
    set((s) => ({ accounts: [...s.accounts, account] }));
    return account;
  },

  updateAccount: async (id, patch) => {
    const prev = get().accounts.find((a) => a.id === id);
    if (!prev) return;

    // Stamp balanceUpdatedAt whenever the balance is being changed by the user,
    // unless the caller is explicitly setting it themselves.
    const balanceChanged = patch.balance !== undefined && patch.balance !== prev.balance;
    const finalPatch: Partial<Account> = { ...patch };
    if (balanceChanged && patch.balanceUpdatedAt === undefined) {
      finalPatch.balanceUpdatedAt = new Date().toISOString();
    }

    set((s) => ({ accounts: s.accounts.map((x) => (x.id === id ? { ...x, ...finalPatch } : x)) }));
    const supabase = createClient();
    const { error } = await supabase.from("accounts").update(accountToUpdate(finalPatch)).eq("id", id);
    if (error) {
      toast.error(error.message);
      set((s) => ({ accounts: s.accounts.map((x) => (x.id === id ? prev : x)) }));
    }
  },

  removeAccount: async (id) => {
    const prev = get();
    set((s) => ({
      accounts: s.accounts.filter((x) => x.id !== id),
      transactions: s.transactions.filter((t) => t.accountId !== id && t.toAccountId !== id),
      recurringPayments: s.recurringPayments.map((r) => (r.accountId === id ? { ...r, accountId: undefined } : r)),
      goals: s.goals.map((g) => (g.accountId === id ? { ...g, accountId: undefined } : g)),
    }));
    const supabase = createClient();
    const { error } = await supabase.from("accounts").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      set({
        accounts: prev.accounts,
        transactions: prev.transactions,
        recurringPayments: prev.recurringPayments,
        goals: prev.goals,
      });
    }
  },

  /* ---------- Transactions ---------- */

  addTransaction: async (t) => {
    const userId = get().userId;
    if (!userId) return null;
    const supabase = createClient();
    const { data, error } = await supabase
      .from("transactions")
      .insert(transactionToInsert(t, userId))
      .select()
      .single();
    if (error || !data) {
      toast.error(error?.message ?? "Couldn't add transaction");
      return null;
    }
    const tx = rowToTransaction(data);
    set((s) => ({ transactions: [tx, ...s.transactions] }));
    await applyTransactionToBalance(tx, "add");
    return tx;
  },

  updateTransaction: async (id, patch) => {
    const prev = get().transactions.find((t) => t.id === id);
    if (!prev) return;
    await applyTransactionToBalance(prev, "remove");
    const next = { ...prev, ...patch };
    set((s) => ({ transactions: s.transactions.map((t) => (t.id === id ? next : t)) }));
    const supabase = createClient();
    const { error } = await supabase.from("transactions").update(transactionToUpdate(patch)).eq("id", id);
    if (error) {
      toast.error(error.message);
      set((s) => ({ transactions: s.transactions.map((t) => (t.id === id ? prev : t)) }));
      await applyTransactionToBalance(prev, "add");
      return;
    }
    await applyTransactionToBalance(next, "add");
  },

  removeTransaction: async (id) => {
    const tx = get().transactions.find((t) => t.id === id);
    if (!tx) return;
    set((s) => ({ transactions: s.transactions.filter((t) => t.id !== id) }));
    await applyTransactionToBalance(tx, "remove");
    const supabase = createClient();
    const { error } = await supabase.from("transactions").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      set((s) => ({ transactions: [tx, ...s.transactions] }));
      await applyTransactionToBalance(tx, "add");
    }
  },

  /* ---------- Recurring payments ---------- */

  addRecurringPayment: async (s) => {
    const userId = get().userId;
    if (!userId) return null;
    const supabase = createClient();
    const { data, error } = await supabase
      .from("recurring_payments")
      .insert(recurringPaymentToInsert(s, userId))
      .select()
      .single();
    if (error || !data) {
      toast.error(error?.message ?? "Couldn't add recurring payment");
      return null;
    }
    const item = rowToRecurringPayment(data);
    set((st) => ({ recurringPayments: [...st.recurringPayments, item] }));
    return item;
  },

  updateRecurringPayment: async (id, patch) => {
    const prev = get().recurringPayments.find((x) => x.id === id);
    if (!prev) return;
    set((s) => ({ recurringPayments: s.recurringPayments.map((x) => (x.id === id ? { ...x, ...patch } : x)) }));
    const supabase = createClient();
    const { error } = await supabase.from("recurring_payments").update(recurringPaymentToUpdate(patch)).eq("id", id);
    if (error) {
      toast.error(error.message);
      set((s) => ({ recurringPayments: s.recurringPayments.map((x) => (x.id === id ? prev : x)) }));
    }
  },

  removeRecurringPayment: async (id) => {
    const prev = get().recurringPayments.find((x) => x.id === id);
    if (!prev) return;
    set((s) => ({ recurringPayments: s.recurringPayments.filter((x) => x.id !== id) }));
    const supabase = createClient();
    const { error } = await supabase.from("recurring_payments").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      set((s) => ({ recurringPayments: [...s.recurringPayments, prev] }));
    }
  },

  /* ---------- Goals ---------- */

  addGoal: async (g) => {
    const userId = get().userId;
    if (!userId) return null;
    const supabase = createClient();
    const { data, error } = await supabase
      .from("savings_goals")
      .insert(goalToInsert(g, userId))
      .select()
      .single();
    if (error || !data) {
      toast.error(error?.message ?? "Couldn't add goal");
      return null;
    }
    const goal = rowToGoal(data);
    set((s) => ({ goals: [...s.goals, goal] }));
    return goal;
  },

  updateGoal: async (id, patch) => {
    const prev = get().goals.find((x) => x.id === id);
    if (!prev) return;
    set((s) => ({ goals: s.goals.map((x) => (x.id === id ? { ...x, ...patch } : x)) }));
    const supabase = createClient();
    const { error } = await supabase.from("savings_goals").update(goalToUpdate(patch)).eq("id", id);
    if (error) {
      toast.error(error.message);
      set((s) => ({ goals: s.goals.map((x) => (x.id === id ? prev : x)) }));
    }
  },

  removeGoal: async (id) => {
    const prev = get().goals.find((x) => x.id === id);
    if (!prev) return;
    set((s) => ({ goals: s.goals.filter((x) => x.id !== id) }));
    const supabase = createClient();
    const { error } = await supabase.from("savings_goals").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      set((s) => ({ goals: [...s.goals, prev] }));
    }
  },

  /* ---------- Debt plan ---------- */

  setDebtPlan: async (p) => {
    const userId = get().userId;
    if (!userId) return;
    const prev = get().debtPlan;
    const next = { ...prev, ...p };
    set({ debtPlan: next });
    const supabase = createClient();
    const { error } = await supabase
      .from("debt_plans")
      .upsert({
        user_id: userId,
        strategy: next.strategy,
        extra_per_month: next.extraPerMonth,
        custom_order: next.customOrder ?? null,
      })
      .eq("user_id", userId);
    if (error) {
      toast.error(error.message);
      set({ debtPlan: prev });
    }
  },
}));

/* ---------- Account balance side-effect ----------
   Credit cards and loans are user-managed: their balance is whatever the user
   last said it was (the lender is the source of truth, the app only logs the
   user's transactions for category/cashflow tracking). So we skip those.

   For asset accounts (checking, savings, cash, investment) we still keep the
   running balance up to date as transactions are added/removed.
*/

function isLiabilityAccount(a: { type: Account["type"] }): boolean {
  return a.type === "credit" || a.type === "loan";
}

async function applyTransactionToBalance(tx: Transaction, op: "add" | "remove") {
  const sign = op === "add" ? 1 : -1;
  const accounts = useFinance.getState().accounts;
  const updates = new Map<string, number>();

  const from = accounts.find((a) => a.id === tx.accountId);
  if (!from) return;

  if (tx.type === "expense") {
    if (!isLiabilityAccount(from)) {
      updates.set(from.id, from.balance + -tx.amount * sign);
    }
  } else if (tx.type === "income") {
    if (!isLiabilityAccount(from)) {
      updates.set(from.id, from.balance + +tx.amount * sign);
    }
  } else if (tx.type === "transfer" && tx.toAccountId) {
    const to = accounts.find((a) => a.id === tx.toAccountId);
    if (!to) return;
    // Source side: only debit asset sources. A "transfer from a credit card" (cash
    // advance) doesn't credit the card here — the user reconciles it manually.
    if (!isLiabilityAccount(from)) {
      updates.set(from.id, from.balance + -tx.amount * sign);
    }
    // Destination side: only credit asset destinations. Paying off a credit card
    // doesn't debit the card here — same reconciliation rule.
    if (!isLiabilityAccount(to)) {
      updates.set(to.id, to.balance + +tx.amount * sign);
    }
  }

  if (updates.size === 0) return;

  // Local optimistic update, then persist.
  useFinance.setState((s) => ({
    accounts: s.accounts.map((a) =>
      updates.has(a.id) ? { ...a, balance: round2(updates.get(a.id)!) } : a,
    ),
  }));

  const supabase = createClient();
  await Promise.all(
    Array.from(updates.entries()).map(([id, balance]) =>
      supabase.from("accounts").update({ balance: round2(balance) }).eq("id", id),
    ),
  );
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}
