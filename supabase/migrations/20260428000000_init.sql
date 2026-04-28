-- Dead Pres initial schema
-- Every table is owned by an auth user via user_id; RLS forces strict per-user access.

set check_function_bodies = off;

-- ============================================================
-- accounts
-- ============================================================
create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  type text not null check (type in ('checking','savings','credit','loan','investment','cash','other')),
  balance numeric(14,2) not null default 0,
  credit_limit numeric(14,2),
  apr numeric(6,3),
  minimum_payment numeric(14,2),
  payoff_date timestamptz,
  institution text,
  color text not null default 'violet',
  icon text,
  notes text,
  archived boolean not null default false,
  created_at timestamptz not null default now()
);

create index accounts_user_id_idx on public.accounts(user_id);

-- ============================================================
-- transactions
-- ============================================================
create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid not null references public.accounts(id) on delete cascade,
  to_account_id uuid references public.accounts(id) on delete set null,
  amount numeric(14,2) not null check (amount >= 0),
  type text not null check (type in ('expense','income','transfer')),
  category text not null,
  merchant text,
  notes text,
  date timestamptz not null,
  pending boolean not null default false,
  created_at timestamptz not null default now()
);

create index transactions_user_id_idx on public.transactions(user_id);
create index transactions_account_id_idx on public.transactions(account_id);
create index transactions_date_idx on public.transactions(date desc);

-- ============================================================
-- subscriptions
-- ============================================================
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  amount numeric(14,2) not null check (amount >= 0),
  frequency text not null check (frequency in ('daily','weekly','biweekly','monthly','quarterly','yearly')),
  category text not null default 'subscriptions',
  account_id uuid references public.accounts(id) on delete set null,
  next_charge_date timestamptz not null,
  start_date timestamptz not null default now(),
  active boolean not null default true,
  notes text,
  color text not null default 'violet',
  icon text,
  created_at timestamptz not null default now()
);

create index subscriptions_user_id_idx on public.subscriptions(user_id);

-- ============================================================
-- savings_goals
-- ============================================================
create table public.savings_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  target_amount numeric(14,2) not null check (target_amount > 0),
  current_amount numeric(14,2) not null default 0,
  target_date timestamptz,
  account_id uuid references public.accounts(id) on delete set null,
  monthly_contribution numeric(14,2),
  color text not null default 'mint',
  icon text,
  created_at timestamptz not null default now()
);

create index savings_goals_user_id_idx on public.savings_goals(user_id);

-- ============================================================
-- debt_plans (one per user)
-- ============================================================
create table public.debt_plans (
  user_id uuid primary key references auth.users(id) on delete cascade,
  strategy text not null default 'avalanche' check (strategy in ('avalanche','snowball','highest-balance','custom')),
  extra_per_month numeric(14,2) not null default 0,
  custom_order jsonb,
  updated_at timestamptz not null default now()
);

-- ============================================================
-- profiles (lightweight per-user metadata; auto-created on signup)
-- ============================================================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  has_onboarded boolean not null default false,
  currency text not null default 'USD',
  created_at timestamptz not null default now()
);

-- Auto-create a profile row on user signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email));
  insert into public.debt_plans (user_id) values (new.id);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- Row Level Security
-- ============================================================
alter table public.accounts enable row level security;
alter table public.transactions enable row level security;
alter table public.subscriptions enable row level security;
alter table public.savings_goals enable row level security;
alter table public.debt_plans enable row level security;
alter table public.profiles enable row level security;

-- accounts
create policy "accounts: select own" on public.accounts
  for select using (auth.uid() = user_id);
create policy "accounts: insert own" on public.accounts
  for insert with check (auth.uid() = user_id);
create policy "accounts: update own" on public.accounts
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "accounts: delete own" on public.accounts
  for delete using (auth.uid() = user_id);

-- transactions
create policy "transactions: select own" on public.transactions
  for select using (auth.uid() = user_id);
create policy "transactions: insert own" on public.transactions
  for insert with check (auth.uid() = user_id);
create policy "transactions: update own" on public.transactions
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "transactions: delete own" on public.transactions
  for delete using (auth.uid() = user_id);

-- subscriptions
create policy "subscriptions: select own" on public.subscriptions
  for select using (auth.uid() = user_id);
create policy "subscriptions: insert own" on public.subscriptions
  for insert with check (auth.uid() = user_id);
create policy "subscriptions: update own" on public.subscriptions
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "subscriptions: delete own" on public.subscriptions
  for delete using (auth.uid() = user_id);

-- savings_goals
create policy "savings_goals: select own" on public.savings_goals
  for select using (auth.uid() = user_id);
create policy "savings_goals: insert own" on public.savings_goals
  for insert with check (auth.uid() = user_id);
create policy "savings_goals: update own" on public.savings_goals
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "savings_goals: delete own" on public.savings_goals
  for delete using (auth.uid() = user_id);

-- debt_plans
create policy "debt_plans: select own" on public.debt_plans
  for select using (auth.uid() = user_id);
create policy "debt_plans: insert own" on public.debt_plans
  for insert with check (auth.uid() = user_id);
create policy "debt_plans: update own" on public.debt_plans
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "debt_plans: delete own" on public.debt_plans
  for delete using (auth.uid() = user_id);

-- profiles
create policy "profiles: select own" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles: update own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);
