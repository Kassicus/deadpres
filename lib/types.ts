export type AccountType =
  | "checking"
  | "savings"
  | "credit"
  | "loan"
  | "investment"
  | "cash"
  | "other";

export type AccountColor =
  | "violet"
  | "mint"
  | "coral"
  | "amber"
  | "sky"
  | "rose"
  | "lime"
  | "stone";

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  /**
   * Current balance. For credit/loan accounts this is the amount owed (positive number).
   * For other types this is what you have.
   */
  balance: number;
  /** Credit limit (credit cards) or original loan amount */
  creditLimit?: number;
  /** Annual interest rate, percentage points (e.g. 5.5 = 5.5%) */
  apr?: number;
  /** Minimum monthly payment for credit/loan */
  minimumPayment?: number;
  /** ISO date of expected payoff or maturity, optional */
  payoffDate?: string;
  institution?: string;
  color: AccountColor;
  icon?: string;
  notes?: string;
  archived?: boolean;
  createdAt: string;
}

export type TransactionType = "expense" | "income" | "transfer";

export interface Transaction {
  id: string;
  accountId: string;
  /** Destination for transfers */
  toAccountId?: string;
  amount: number; // always positive; sign derived from `type`
  type: TransactionType;
  category: string;
  merchant?: string;
  notes?: string;
  date: string; // ISO
  pending?: boolean;
  createdAt: string;
}

export type RecurrenceFrequency =
  | "daily"
  | "weekly"
  | "biweekly"
  | "monthly"
  | "quarterly"
  | "yearly";

export interface Subscription {
  id: string;
  name: string;
  amount: number;
  frequency: RecurrenceFrequency;
  category: string;
  accountId?: string;
  nextChargeDate: string; // ISO
  startDate: string; // ISO
  active: boolean;
  notes?: string;
  color: AccountColor;
  icon?: string;
  createdAt: string;
}

export interface SavingsGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate?: string;
  /** Optional account that backs this goal */
  accountId?: string;
  monthlyContribution?: number;
  color: AccountColor;
  icon?: string;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  group: "essentials" | "lifestyle" | "savings" | "income" | "debt" | "other";
  color: AccountColor;
  icon?: string;
}

export type DebtStrategy = "avalanche" | "snowball" | "highest-balance" | "custom";

export interface DebtPlan {
  strategy: DebtStrategy;
  /** Total monthly amount user wants to throw at debts (above minimums) */
  extraPerMonth: number;
  /** For custom strategy: ordered account IDs */
  customOrder?: string[];
}

export interface AppMeta {
  currency: string;
  hasSeeded: boolean;
  createdAt: string;
}
