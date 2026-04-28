-- Add flexible schedules + income/expense direction to recurring payments.
-- Schedule is stored as a jsonb discriminated union (see lib/types.ts).
-- next_charge_date stays as a denormalized "next due" so we can still query it cheaply.
-- posted_through tracks the timestamp through which we've auto-created transactions.

alter table public.recurring_payments
  add column direction text not null default 'expense' check (direction in ('income','expense')),
  add column schedule jsonb,
  add column posted_through timestamptz;

-- Backfill schedule from the existing frequency + start_date.
update public.recurring_payments
set schedule = jsonb_build_object(
  'kind', 'fixed',
  'frequency', frequency,
  'anchor', start_date::text
)
where schedule is null;

alter table public.recurring_payments alter column schedule set not null;
alter table public.recurring_payments drop column frequency;

-- Useful index for the auto-poster that scans for due occurrences.
create index if not exists recurring_payments_active_next_idx
  on public.recurring_payments(user_id, active, next_charge_date)
  where active = true;
