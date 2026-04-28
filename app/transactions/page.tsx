"use client";

import * as React from "react";
import { Plus, Search, ArrowUpRight, ArrowDownLeft, ArrowLeftRight, X } from "lucide-react";
import { Topbar } from "@/components/shell/topbar";
import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useFinance } from "@/lib/store";
import { TransactionRow } from "@/components/transactions/transaction-row";
import { AddTransactionDialog } from "@/components/transactions/add-transaction-dialog";
import { EmptyState } from "@/components/shell/empty-state";
import { Inbox } from "lucide-react";
import { Card } from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/format";
import { cashflow } from "@/lib/finance";
import type { TransactionType } from "@/lib/types";
import { DEFAULT_CATEGORIES } from "@/lib/categories";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function TransactionsPage() {
  const transactions = useFinance((s) => s.transactions);
  const accounts = useFinance((s) => s.accounts);

  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [type, setType] = React.useState<TransactionType | "all">("all");
  const [accountId, setAccountId] = React.useState<string>("all");
  const [category, setCategory] = React.useState<string>("all");

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return transactions
      .filter((t) => {
        if (type !== "all" && t.type !== type) return false;
        if (accountId !== "all" && t.accountId !== accountId && t.toAccountId !== accountId) return false;
        if (category !== "all" && t.category !== category) return false;
        if (q && !(t.merchant?.toLowerCase().includes(q) || t.notes?.toLowerCase().includes(q) || t.category.toLowerCase().includes(q))) {
          return false;
        }
        return true;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, query, type, accountId, category]);

  // Group by day
  const groups = React.useMemo(() => {
    const map = new Map<string, typeof filtered>();
    for (const tx of filtered) {
      const key = new Date(tx.date).toISOString().slice(0, 10);
      const arr = map.get(key) ?? [];
      arr.push(tx);
      map.set(key, arr);
    }
    return Array.from(map.entries()).map(([date, txs]) => ({ date, txs }));
  }, [filtered]);

  const totals = cashflow(filtered);

  return (
    <>
      <Topbar title="Transactions" description="Search, filter, and manage every transaction." />
      <main className="px-4 lg:px-8 py-6 max-w-[1400px] w-full">
        <PageHeader
          title="Transactions"
          description={`${filtered.length} ${filtered.length === 1 ? "transaction" : "transactions"} matching filters`}
          action={
            <Button onClick={() => setOpen(true)} className="gap-1.5">
              <Plus /> New transaction
            </Button>
          }
        />

        <div className="grid grid-cols-3 gap-3 mb-6">
          <SummaryStat label="Income" value={formatCurrency(totals.income)} color="text-success" />
          <SummaryStat label="Spending" value={formatCurrency(totals.expense)} color="text-foreground" />
          <SummaryStat label="Net" value={formatCurrency(totals.net, { signed: true })} color={totals.net >= 0 ? "text-success" : "text-destructive"} />
        </div>

        <Card className="p-4 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto_auto] gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search merchant, category, or notes..."
                className="pl-9"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              {query && (
                <button
                  onClick={() => setQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label="Clear search"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>
            <Select value={accountId} onValueChange={setAccountId}>
              <SelectTrigger className="md:w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All accounts</SelectItem>
                {accounts.map((a) => (
                  <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="md:w-44"><SelectValue /></SelectTrigger>
              <SelectContent className="max-h-72">
                <SelectItem value="all">All categories</SelectItem>
                {DEFAULT_CATEGORIES.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Tabs value={type} onValueChange={(v) => setType(v as TransactionType | "all")}>
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="expense" className="gap-1"><ArrowUpRight className="size-3" /> Out</TabsTrigger>
                <TabsTrigger value="income" className="gap-1"><ArrowDownLeft className="size-3" /> In</TabsTrigger>
                <TabsTrigger value="transfer"><ArrowLeftRight className="size-3" /></TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </Card>

        {filtered.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title="No matching transactions"
            description="Try adjusting your filters, or add a new transaction."
            action={
              <Button onClick={() => setOpen(true)} className="gap-1.5">
                <Plus /> Add transaction
              </Button>
            }
          />
        ) : (
          <Card className="p-2">
            <div className="space-y-2">
              {groups.map((g) => (
                <div key={g.date}>
                  <div className="px-3 pt-3 pb-1 text-[11px] uppercase tracking-widest text-muted-foreground">
                    {formatDate(g.date, "long")}
                  </div>
                  <div className="space-y-0.5">
                    {g.txs.map((t) => (
                      <TransactionRow key={t.id} tx={t} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        <AddTransactionDialog open={open} onOpenChange={setOpen} />
      </main>
    </>
  );
}

function SummaryStat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-xl border border-border/70 bg-card p-4">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className={`text-xl font-semibold tracking-tight num mt-1 ${color}`}>{value}</div>
    </div>
  );
}
