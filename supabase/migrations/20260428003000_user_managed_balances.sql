-- Credit/loan accounts become user-managed: their balance is whatever the user
-- last said it was. Transactions on them are recorded for categorization but
-- don't auto-adjust the balance. Track when the user last reconciled with
-- balance_updated_at so we can show a "stale" indicator.

alter table public.accounts add column balance_updated_at timestamptz;

update public.accounts
set balance_updated_at = created_at
where balance_updated_at is null;

alter table public.accounts alter column balance_updated_at set not null;
alter table public.accounts alter column balance_updated_at set default now();
