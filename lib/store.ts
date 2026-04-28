"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { v4 as uuid } from "uuid";
import type { Account, DebtPlan, SavingsGoal, Subscription, Transaction } from "./types";
import { makeSeed } from "./seed";

interface FinanceState {
  hydrated: boolean;
  accounts: Account[];
  transactions: Transaction[];
  subscriptions: Subscription[];
  goals: SavingsGoal[];
  debtPlan: DebtPlan;
  hasSeeded: boolean;

  setHydrated: (b: boolean) => void;

  addAccount: (a: Omit<Account, "id" | "createdAt">) => Account;
  updateAccount: (id: string, patch: Partial<Account>) => void;
  removeAccount: (id: string) => void;

  addTransaction: (t: Omit<Transaction, "id" | "createdAt">) => Transaction;
  updateTransaction: (id: string, patch: Partial<Transaction>) => void;
  removeTransaction: (id: string) => void;

  addSubscription: (s: Omit<Subscription, "id" | "createdAt">) => Subscription;
  updateSubscription: (id: string, patch: Partial<Subscription>) => void;
  removeSubscription: (id: string) => void;

  addGoal: (g: Omit<SavingsGoal, "id" | "createdAt">) => SavingsGoal;
  updateGoal: (id: string, patch: Partial<SavingsGoal>) => void;
  removeGoal: (id: string) => void;

  setDebtPlan: (p: Partial<DebtPlan>) => void;

  seedDemo: () => void;
  reset: () => void;
}

const DEFAULT_PLAN: DebtPlan = {
  strategy: "avalanche",
  extraPerMonth: 200,
};

export const useFinance = create<FinanceState>()(
  persist(
    (set, get) => ({
      hydrated: false,
      accounts: [],
      transactions: [],
      subscriptions: [],
      goals: [],
      debtPlan: DEFAULT_PLAN,
      hasSeeded: false,

      setHydrated: (b) => set({ hydrated: b }),

      addAccount: (a) => {
        const account: Account = { ...a, id: uuid(), createdAt: new Date().toISOString() };
        set((s) => ({ accounts: [...s.accounts, account] }));
        return account;
      },
      updateAccount: (id, patch) =>
        set((s) => ({ accounts: s.accounts.map((x) => (x.id === id ? { ...x, ...patch } : x)) })),
      removeAccount: (id) =>
        set((s) => ({
          accounts: s.accounts.filter((x) => x.id !== id),
          transactions: s.transactions.filter((t) => t.accountId !== id && t.toAccountId !== id),
          subscriptions: s.subscriptions.map((sub) => (sub.accountId === id ? { ...sub, accountId: undefined } : sub)),
          goals: s.goals.map((g) => (g.accountId === id ? { ...g, accountId: undefined } : g)),
        })),

      addTransaction: (t) => {
        const tx: Transaction = { ...t, id: uuid(), createdAt: new Date().toISOString() };
        set((s) => ({ transactions: [tx, ...s.transactions] }));
        applyTransactionToBalance(tx, "add");
        return tx;
      },
      updateTransaction: (id, patch) => {
        const prev = get().transactions.find((t) => t.id === id);
        if (!prev) return;
        if (prev) applyTransactionToBalance(prev, "remove");
        const next = { ...prev, ...patch };
        set((s) => ({ transactions: s.transactions.map((t) => (t.id === id ? next : t)) }));
        applyTransactionToBalance(next, "add");
      },
      removeTransaction: (id) => {
        const tx = get().transactions.find((t) => t.id === id);
        if (tx) applyTransactionToBalance(tx, "remove");
        set((s) => ({ transactions: s.transactions.filter((t) => t.id !== id) }));
      },

      addSubscription: (s) => {
        const sub: Subscription = { ...s, id: uuid(), createdAt: new Date().toISOString() };
        set((st) => ({ subscriptions: [...st.subscriptions, sub] }));
        return sub;
      },
      updateSubscription: (id, patch) =>
        set((s) => ({ subscriptions: s.subscriptions.map((x) => (x.id === id ? { ...x, ...patch } : x)) })),
      removeSubscription: (id) =>
        set((s) => ({ subscriptions: s.subscriptions.filter((x) => x.id !== id) })),

      addGoal: (g) => {
        const goal: SavingsGoal = { ...g, id: uuid(), createdAt: new Date().toISOString() };
        set((s) => ({ goals: [...s.goals, goal] }));
        return goal;
      },
      updateGoal: (id, patch) =>
        set((s) => ({ goals: s.goals.map((x) => (x.id === id ? { ...x, ...patch } : x)) })),
      removeGoal: (id) =>
        set((s) => ({ goals: s.goals.filter((x) => x.id !== id) })),

      setDebtPlan: (p) => set((s) => ({ debtPlan: { ...s.debtPlan, ...p } })),

      seedDemo: () => {
        const seed = makeSeed();
        set({
          accounts: seed.accounts,
          transactions: seed.transactions,
          subscriptions: seed.subscriptions,
          goals: seed.goals,
          hasSeeded: true,
          debtPlan: DEFAULT_PLAN,
        });
      },
      reset: () =>
        set({
          accounts: [],
          transactions: [],
          subscriptions: [],
          goals: [],
          debtPlan: DEFAULT_PLAN,
          hasSeeded: false,
        }),
    }),
    {
      name: "deadpres-finance-v1",
      storage: createJSONStorage(() => (typeof window !== "undefined" ? window.localStorage : noopStorage())),
      partialize: (s) => ({
        accounts: s.accounts,
        transactions: s.transactions,
        subscriptions: s.subscriptions,
        goals: s.goals,
        debtPlan: s.debtPlan,
        hasSeeded: s.hasSeeded,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
    },
  ),
);

function applyTransactionToBalance(tx: Transaction, op: "add" | "remove") {
  const sign = op === "add" ? 1 : -1;
  const accounts = useFinance.getState().accounts;
  const updates: Record<string, number> = {};

  const from = accounts.find((a) => a.id === tx.accountId);
  if (!from) return;

  const isLiability = from.type === "credit" || from.type === "loan";

  if (tx.type === "expense") {
    // Liability expense: balance owed grows. Asset expense: balance shrinks.
    updates[from.id] = (updates[from.id] ?? from.balance) + (isLiability ? +tx.amount : -tx.amount) * sign;
  } else if (tx.type === "income") {
    // Liability income (a refund) reduces owed; asset income increases balance.
    updates[from.id] = (updates[from.id] ?? from.balance) + (isLiability ? -tx.amount : +tx.amount) * sign;
  } else if (tx.type === "transfer" && tx.toAccountId) {
    const to = accounts.find((a) => a.id === tx.toAccountId);
    if (!to) return;
    const fromIsLiab = isLiability;
    const toIsLiab = to.type === "credit" || to.type === "loan";
    // Money out of source: liability decreases (paying down), asset decreases too.
    updates[from.id] = (updates[from.id] ?? from.balance) + (fromIsLiab ? -tx.amount : -tx.amount) * sign;
    updates[to.id] = (updates[to.id] ?? to.balance) + (toIsLiab ? -tx.amount : +tx.amount) * sign;
  }

  useFinance.setState((s) => ({
    accounts: s.accounts.map((a) =>
      updates[a.id] !== undefined ? { ...a, balance: round2(updates[a.id]) } : a,
    ),
  }));
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function noopStorage() {
  return {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
  };
}
