"use client";

import Link from "next/link";
import { ArrowRight, Inbox } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useFinance } from "@/lib/store";
import { TransactionRow } from "@/components/transactions/transaction-row";

export function RecentTransactions() {
  const transactions = useFinance((s) => s.transactions);
  const recent = [...transactions]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 8);

  return (
    <Card>
      <CardHeader className="pb-1">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Recent activity</CardTitle>
          <Link href="/transactions" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
            View all <ArrowRight className="size-3" />
          </Link>
        </div>
      </CardHeader>
      <CardContent className="px-2">
        {recent.length === 0 ? (
          <div className="flex flex-col items-center text-center py-8 text-muted-foreground">
            <Inbox className="size-6 mb-2" />
            <div className="text-sm">No transactions yet</div>
          </div>
        ) : (
          <div className="space-y-0.5">
            {recent.map((t) => (
              <TransactionRow key={t.id} tx={t} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
