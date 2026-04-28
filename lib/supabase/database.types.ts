// Hand-written database types matching supabase/migrations/20260428000000_init.sql.
// Replace later with generated types: `npx supabase gen types typescript --linked > lib/supabase/database.types.ts`.

type AccountRow = {
  id: string;
  user_id: string;
  name: string;
  type: "checking" | "savings" | "credit" | "loan" | "investment" | "cash" | "other";
  balance: number;
  credit_limit: number | null;
  apr: number | null;
  minimum_payment: number | null;
  payoff_date: string | null;
  institution: string | null;
  color: string;
  icon: string | null;
  notes: string | null;
  archived: boolean;
  created_at: string;
};
type AccountInsert = {
  id?: string;
  user_id: string;
  name: string;
  type: "checking" | "savings" | "credit" | "loan" | "investment" | "cash" | "other";
  balance?: number;
  credit_limit?: number | null;
  apr?: number | null;
  minimum_payment?: number | null;
  payoff_date?: string | null;
  institution?: string | null;
  color?: string;
  icon?: string | null;
  notes?: string | null;
  archived?: boolean;
  created_at?: string;
};

type TransactionRow = {
  id: string;
  user_id: string;
  account_id: string;
  to_account_id: string | null;
  amount: number;
  type: "expense" | "income" | "transfer";
  category: string;
  merchant: string | null;
  notes: string | null;
  date: string;
  pending: boolean;
  created_at: string;
};
type TransactionInsert = {
  id?: string;
  user_id: string;
  account_id: string;
  to_account_id?: string | null;
  amount: number;
  type: "expense" | "income" | "transfer";
  category: string;
  merchant?: string | null;
  notes?: string | null;
  date: string;
  pending?: boolean;
  created_at?: string;
};

type RecurringPaymentRow = {
  id: string;
  user_id: string;
  name: string;
  amount: number;
  direction: "income" | "expense";
  schedule: unknown;
  posted_through: string | null;
  category: string;
  account_id: string | null;
  next_charge_date: string;
  start_date: string;
  active: boolean;
  notes: string | null;
  color: string;
  icon: string | null;
  created_at: string;
};
type RecurringPaymentInsert = {
  id?: string;
  user_id: string;
  name: string;
  amount: number;
  direction?: "income" | "expense";
  schedule: unknown;
  posted_through?: string | null;
  category?: string;
  account_id?: string | null;
  next_charge_date: string;
  start_date?: string;
  active?: boolean;
  notes?: string | null;
  color?: string;
  icon?: string | null;
  created_at?: string;
};

type GoalRow = {
  id: string;
  user_id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  target_date: string | null;
  account_id: string | null;
  monthly_contribution: number | null;
  color: string;
  icon: string | null;
  created_at: string;
};
type GoalInsert = {
  id?: string;
  user_id: string;
  name: string;
  target_amount: number;
  current_amount?: number;
  target_date?: string | null;
  account_id?: string | null;
  monthly_contribution?: number | null;
  color?: string;
  icon?: string | null;
  created_at?: string;
};

type DebtPlanRow = {
  user_id: string;
  strategy: "avalanche" | "snowball" | "highest-balance" | "custom";
  extra_per_month: number;
  custom_order: string[] | null;
  updated_at: string;
};
type DebtPlanInsert = {
  user_id: string;
  strategy?: "avalanche" | "snowball" | "highest-balance" | "custom";
  extra_per_month?: number;
  custom_order?: string[] | null;
  updated_at?: string;
};

type ProfileRow = {
  id: string;
  display_name: string | null;
  has_onboarded: boolean;
  currency: string;
  created_at: string;
};
type ProfileInsert = {
  id: string;
  display_name?: string | null;
  has_onboarded?: boolean;
  currency?: string;
  created_at?: string;
};

export type Database = {
  public: {
    Tables: {
      accounts: { Row: AccountRow; Insert: AccountInsert; Update: Partial<AccountInsert>; Relationships: [] };
      transactions: { Row: TransactionRow; Insert: TransactionInsert; Update: Partial<TransactionInsert>; Relationships: [] };
      recurring_payments: { Row: RecurringPaymentRow; Insert: RecurringPaymentInsert; Update: Partial<RecurringPaymentInsert>; Relationships: [] };
      savings_goals: { Row: GoalRow; Insert: GoalInsert; Update: Partial<GoalInsert>; Relationships: [] };
      debt_plans: { Row: DebtPlanRow; Insert: DebtPlanInsert; Update: Partial<DebtPlanInsert>; Relationships: [] };
      profiles: { Row: ProfileRow; Insert: ProfileInsert; Update: Partial<ProfileInsert>; Relationships: [] };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
};
