"use client";

import * as React from "react";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useFinance } from "@/lib/store";
import type { Account } from "@/lib/types";
import { formatCurrency } from "@/lib/format";
import { ACCOUNT_TYPE_LABELS, accountIcon } from "@/lib/icons";
import { COLOR_HEX } from "@/lib/colors";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { AccountDialog } from "./account-dialog";

export function AccountCard({ account }: { account: Account }) {
  const removeAccount = useFinance((s) => s.removeAccount);
  const [editing, setEditing] = React.useState(false);
  const Icon = accountIcon(account.type);
  const isDebt = account.type === "credit" || account.type === "loan";
  const isCredit = account.type === "credit";

  return (
    <>
      <Card className="relative overflow-hidden p-5 group hover:shadow-lg transition-shadow">
        <div
          className="absolute -top-12 -right-12 size-40 rounded-full opacity-30 blur-3xl pointer-events-none"
          style={{ background: COLOR_HEX[account.color] }}
        />
        <div className="relative flex items-start gap-3">
          <div
            className="size-10 rounded-xl grid place-items-center shrink-0"
            style={{ background: `${COLOR_HEX[account.color]}26`, color: COLOR_HEX[account.color] }}
          >
            <Icon className="size-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <div className="font-semibold tracking-tight truncate">{account.name}</div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon-sm" className="opacity-0 group-hover:opacity-100">
                    <MoreHorizontal />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setEditing(true)}>
                    <Pencil /> Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => {
                      if (confirm(`Delete "${account.name}"? Linked transactions will also be removed.`)) {
                        removeAccount(account.id);
                        toast.success("Account deleted");
                      }
                    }}
                  >
                    <Trash2 /> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <div className="text-xs text-muted-foreground">
              {ACCOUNT_TYPE_LABELS[account.type]}
              {account.institution && ` · ${account.institution}`}
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-baseline justify-between gap-2">
          <div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
              {isDebt ? "Owed" : "Balance"}
            </div>
            <div className={`text-2xl font-semibold tracking-tight num ${isDebt ? "text-coral" : ""}`}>
              {formatCurrency(account.balance)}
            </div>
          </div>
          {account.apr !== undefined && (
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">APR</div>
              <div className="text-sm font-medium num">{account.apr.toFixed(2)}%</div>
            </div>
          )}
        </div>

        {isCredit && account.creditLimit && (
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
              <span>Utilization</span>
              <span className="num">
                {formatCurrency(account.balance)} / {formatCurrency(account.creditLimit)}
              </span>
            </div>
            <Progress
              value={Math.min(100, (account.balance / account.creditLimit) * 100)}
              indicatorStyle={{ background: COLOR_HEX[account.color] }}
            />
          </div>
        )}

        {isDebt && account.minimumPayment !== undefined && account.minimumPayment > 0 && (
          <div className="mt-3 text-xs text-muted-foreground">
            Min payment <span className="text-foreground font-medium num">{formatCurrency(account.minimumPayment)}/mo</span>
          </div>
        )}
      </Card>

      <AccountDialog open={editing} onOpenChange={setEditing} account={account} />
    </>
  );
}
