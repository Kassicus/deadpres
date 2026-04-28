-- Rename subscriptions → recurring_payments to better reflect that the feature
-- covers bills, subscriptions, dues, and any other periodic charges.

alter table public.subscriptions rename to recurring_payments;
alter index subscriptions_user_id_idx rename to recurring_payments_user_id_idx;

alter policy "subscriptions: select own" on public.recurring_payments rename to "recurring_payments: select own";
alter policy "subscriptions: insert own" on public.recurring_payments rename to "recurring_payments: insert own";
alter policy "subscriptions: update own" on public.recurring_payments rename to "recurring_payments: update own";
alter policy "subscriptions: delete own" on public.recurring_payments rename to "recurring_payments: delete own";
