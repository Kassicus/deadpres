"use client";

import * as React from "react";
import { Plus, Wallet } from "lucide-react";
import { Topbar } from "@/components/shell/topbar";
import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { useFinance } from "@/lib/store";
import { AccountCard } from "@/components/accounts/account-card";
import { AccountDialog } from "@/components/accounts/account-dialog";
import { EmptyState } from "@/components/shell/empty-state";
import { netWorth } from "@/lib/finance";
import { formatCurrency } from "@/lib/format";
import { ACCOUNT_TYPE_LABELS } from "@/lib/icons";
import type { AccountType } from "@/lib/types";

const GROUP_ORDER: AccountType[] = ["checking", "savings", "investment", "credit", "loan", "cash", "other"];

export default function AccountsPage() {
  const accounts = useFinance((s) => s.accounts);
  const [open, setOpen] = React.useState(false);

  const { assets, liabilities, total } = netWorth(accounts);

  const grouped = GROUP_ORDER.map((type) => ({
    type,
    accounts: accounts.filter((a) => a.type === type && !a.archived),
  })).filter((g) => g.accounts.length > 0);

  return (
    <>
      <Topbar title="Accounts" description="All your money in one place." />
      <main className="px-4 lg:px-8 py-6 max-w-[1400px] w-full mx-auto">
        <PageHeader
          title="Accounts"
          description="Track every account: cash, savings, credit, loans, and investments."
          action={
            <Button onClick={() => setOpen(true)} className="gap-1.5">
              <Plus /> New account
            </Button>
          }
        />

        {accounts.length === 0 ? (
          <EmptyState
            icon={Wallet}
            title="No accounts yet"
            description="Add your first account to start tracking your money."
            action={
              <Button onClick={() => setOpen(true)} className="gap-1.5">
                <Plus /> Add account
              </Button>
            }
          />
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
              <SummaryStat label="Net Worth" value={formatCurrency(total)} accent="text-foreground" />
              <SummaryStat label="Assets" value={formatCurrency(assets)} accent="text-success" />
              <SummaryStat label="Liabilities" value={formatCurrency(liabilities)} accent="text-coral" />
            </div>

            <div className="space-y-8">
              {grouped.map((group) => (
                <section key={group.type}>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
                      {ACCOUNT_TYPE_LABELS[group.type]}
                    </h3>
                    <span className="text-xs text-muted-foreground num">
                      {formatCurrency(group.accounts.reduce((s, a) => s + (group.type === "credit" || group.type === "loan" ? -a.balance : a.balance), 0))}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                    {group.accounts.map((a) => (
                      <AccountCard key={a.id} account={a} />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </>
        )}

        <AccountDialog open={open} onOpenChange={setOpen} />
      </main>
    </>
  );
}

function SummaryStat({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="rounded-xl border border-border/70 bg-card p-3 sm:p-4 min-w-0">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground truncate">{label}</div>
      <div className={`text-xl sm:text-2xl font-semibold tracking-tight num mt-1 truncate ${accent}`}>{value}</div>
    </div>
  );
}
