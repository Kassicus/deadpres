"use client";

import * as React from "react";
import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { useFinance } from "@/lib/store";
import type { Transaction } from "@/lib/types";
import { getCategory } from "@/lib/categories";
import { COLOR_HEX } from "@/lib/colors";
import { formatCurrency, formatRelative } from "@/lib/format";
import { getIcon } from "@/lib/icons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export function TransactionRow({ tx, dense }: { tx: Transaction; dense?: boolean }) {
  const accounts = useFinance((s) => s.accounts);
  const removeTransaction = useFinance((s) => s.removeTransaction);
  const account = accounts.find((a) => a.id === tx.accountId);
  const toAccount = accounts.find((a) => a.id === tx.toAccountId);
  const category = getCategory(tx.category);
  const Icon = getIcon(category.icon);

  const sign = tx.type === "income" ? "+" : tx.type === "expense" ? "−" : "";
  const valueColor =
    tx.type === "income"
      ? "text-success"
      : tx.type === "expense"
        ? "text-foreground"
        : "text-info";

  const TypeIcon =
    tx.type === "income" ? ArrowDownLeft : tx.type === "transfer" ? ArrowLeftRight : ArrowUpRight;

  return (
    <div className={cn("group flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-accent/40 transition-colors", dense && "py-2")}>
      <div
        className="size-9 rounded-lg grid place-items-center shrink-0 relative"
        style={{ background: `${COLOR_HEX[category.color]}22`, color: COLOR_HEX[category.color] }}
      >
        <Icon className="size-4" />
        <div className="absolute -bottom-1 -right-1 size-4 rounded-full bg-card border border-border grid place-items-center">
          <TypeIcon className={cn("size-2.5", valueColor)} />
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 text-sm font-medium truncate">
          <span className="truncate">{tx.merchant ?? category.name}</span>
          {tx.pending && <span className="text-[10px] uppercase tracking-wide text-warning">Pending</span>}
        </div>
        <div className="text-xs text-muted-foreground truncate">
          {tx.type === "transfer" && toAccount
            ? `${account?.name ?? ""} → ${toAccount.name}`
            : `${category.name} · ${account?.name ?? ""}`}
        </div>
      </div>
      <div className="text-right shrink-0">
        <div className={cn("font-semibold num text-sm", valueColor)}>
          {sign}
          {formatCurrency(tx.amount)}
        </div>
        <div className="text-[11px] text-muted-foreground">{formatRelative(tx.date)}</div>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            className="opacity-0 group-hover:opacity-100 transition-opacity"
            aria-label="Transaction actions"
          >
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onClick={() => {
              removeTransaction(tx.id);
              toast.success("Transaction deleted");
            }}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
