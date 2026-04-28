"use client";

import { createClient } from "./supabase/client";
import { rowToRecurringPayment, rowToTransaction } from "./supabase/mappers";
import type { RecurringPayment } from "./types";
import { nextOccurrence, occurrencesBetween } from "./schedule";

const MAX_BACKFILL_DAYS = 90;

interface AutoPostResult {
  posted: number;
  errored: number;
}

/**
 * Walk every active recurring payment and insert any transactions that came due since
 * the last run. Idempotent: tracked by `posted_through` on each row.
 *
 * Strategy:
 * - First time a payment is seen (posted_through is null): set posted_through to its
 *   start_date but cap at 90 days back, so a brand-new schedule with a far-past anchor
 *   doesn't dump months of history.
 * - On each call: list occurrences in (posted_through, now], insert one transaction
 *   per occurrence, advance posted_through, and recompute next_charge_date.
 */
export async function postDueOccurrences(userId: string): Promise<AutoPostResult> {
  const supabase = createClient();
  const now = new Date();
  let posted = 0;
  let errored = 0;

  const { data: rows, error } = await supabase
    .from("recurring_payments")
    .select("*")
    .eq("user_id", userId)
    .eq("active", true);

  if (error || !rows) return { posted: 0, errored: rows ? 0 : 1 };

  for (const row of rows) {
    const item = rowToRecurringPayment(row);
    try {
      const result = await processRecurringPayment(item, userId, now);
      posted += result.posted;
    } catch (e) {
      console.error("auto-post failed for", item.id, e);
      errored++;
    }
  }

  return { posted, errored };
}

async function processRecurringPayment(
  item: RecurringPayment,
  userId: string,
  now: Date,
): Promise<{ posted: number }> {
  const supabase = createClient();

  // First-run baseline: cap how far back we'll backfill.
  const ninetyDaysAgo = new Date(now.getTime() - MAX_BACKFILL_DAYS * 86_400_000);
  const baseline = item.postedThrough
    ? new Date(item.postedThrough)
    : new Date(Math.max(new Date(item.startDate).getTime(), ninetyDaysAgo.getTime()));

  if (baseline.getTime() >= now.getTime()) {
    // Nothing to post; just keep next_charge_date fresh.
    const next = nextOccurrence(item.schedule, now);
    if (next.toISOString() !== item.nextChargeDate) {
      await supabase
        .from("recurring_payments")
        .update({ next_charge_date: next.toISOString() })
        .eq("id", item.id);
    }
    return { posted: 0 };
  }

  // Look for occurrences strictly after baseline, up to and including now.
  const just_after = new Date(baseline.getTime() + 1);
  const due = occurrencesBetween(item.schedule, just_after, now);

  let posted = 0;
  for (const occurrence of due) {
    const ok = await postSingleOccurrence(item, userId, occurrence);
    if (ok) posted++;
  }

  // Advance bookkeeping fields.
  const upcoming = nextOccurrence(item.schedule, new Date(now.getTime() + 1));
  await supabase
    .from("recurring_payments")
    .update({
      posted_through: now.toISOString(),
      next_charge_date: upcoming.toISOString(),
    })
    .eq("id", item.id);

  return { posted };
}

async function postSingleOccurrence(
  item: RecurringPayment,
  userId: string,
  occurrence: Date,
): Promise<boolean> {
  const supabase = createClient();
  const accountId = item.accountId;
  if (!accountId) {
    // No account picked — skip silently. The user will see it on the recurring page.
    return false;
  }

  // Idempotency: skip if a transaction with the same recurring metadata already exists.
  // We stamp the notes field with a tag the auto-poster owns.
  const tag = recurringTag(item.id, occurrence);
  const { data: existing } = await supabase
    .from("transactions")
    .select("id")
    .eq("user_id", userId)
    .eq("account_id", accountId)
    .like("notes", `%${tag}%`)
    .limit(1);
  if (existing && existing.length > 0) return false;

  const { error: insertError } = await supabase.from("transactions").insert({
    user_id: userId,
    account_id: accountId,
    amount: item.amount,
    type: item.direction === "income" ? "income" : "expense",
    category: item.category,
    merchant: item.name,
    notes: tag,
    date: occurrence.toISOString(),
  });
  if (insertError) {
    console.error("transaction insert failed", insertError);
    return false;
  }

  // Adjust account balance through the same code path the store uses.
  // We do this directly here to avoid re-fetching: positive flow → balance up for assets,
  // down for liabilities; negative flow → opposite.
  await adjustBalance(accountId, item.direction === "income" ? item.amount : -item.amount);
  return true;
}

async function adjustBalance(accountId: string, delta: number) {
  const supabase = createClient();
  const { data: account } = await supabase
    .from("accounts")
    .select("balance, type")
    .eq("id", accountId)
    .maybeSingle();
  if (!account) return;
  const isLiability = account.type === "credit" || account.type === "loan";
  const next = round2(Number(account.balance) + (isLiability ? -delta : delta));
  await supabase.from("accounts").update({ balance: next }).eq("id", accountId);
}

function recurringTag(recurringId: string, occurrence: Date): string {
  return `[auto:${recurringId}:${occurrence.toISOString().slice(0, 10)}]`;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// Keep an export so future code can re-derive the tag for a given pair if we add un-post.
export { recurringTag };

// Suppress unused-warning for rowToTransaction even though we may use it elsewhere.
void rowToTransaction;
