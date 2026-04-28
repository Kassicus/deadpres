"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useFinance } from "@/lib/store";
import type { Account, AccountColor, AccountType } from "@/lib/types";
import { ACCOUNT_COLORS, COLOR_HEX } from "@/lib/colors";
import { ACCOUNT_TYPE_LABELS } from "@/lib/icons";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (b: boolean) => void;
  account?: Account;
}

export function AccountDialog({ open, onOpenChange, account }: Props) {
  const addAccount = useFinance((s) => s.addAccount);
  const updateAccount = useFinance((s) => s.updateAccount);

  const [name, setName] = React.useState("");
  const [type, setType] = React.useState<AccountType>("checking");
  const [balance, setBalance] = React.useState("");
  const [institution, setInstitution] = React.useState("");
  const [apr, setApr] = React.useState("");
  const [creditLimit, setCreditLimit] = React.useState("");
  const [minimumPayment, setMinimumPayment] = React.useState("");
  const [color, setColor] = React.useState<AccountColor>("violet");

  React.useEffect(() => {
    if (open) {
      setName(account?.name ?? "");
      setType(account?.type ?? "checking");
      setBalance(account?.balance != null ? String(account.balance) : "");
      setInstitution(account?.institution ?? "");
      setApr(account?.apr != null ? String(account.apr) : "");
      setCreditLimit(account?.creditLimit != null ? String(account.creditLimit) : "");
      setMinimumPayment(account?.minimumPayment != null ? String(account.minimumPayment) : "");
      setColor(account?.color ?? randomColor());
    }
  }, [open, account]);

  const isDebt = type === "credit" || type === "loan";

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Give your account a name");
      return;
    }
    const b = parseFloat(balance) || 0;
    const aprN = apr ? parseFloat(apr) : undefined;
    const limitN = creditLimit ? parseFloat(creditLimit) : undefined;
    const minN = minimumPayment ? parseFloat(minimumPayment) : undefined;

    const payload = {
      name: name.trim(),
      type,
      balance: b,
      institution: institution.trim() || undefined,
      apr: aprN,
      creditLimit: limitN,
      minimumPayment: minN,
      color,
    };

    if (account) {
      updateAccount(account.id, payload);
      toast.success("Account updated");
    } else {
      addAccount(payload);
      toast.success("Account added");
    }
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{account ? "Edit account" : "New account"}</DialogTitle>
          <DialogDescription>
            {account ? "Update your account details." : "Add a checking, savings, credit card, loan, or investment account."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Name</Label>
            <Input id="name" placeholder="e.g. Everyday Checking" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as AccountType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(ACCOUNT_TYPE_LABELS) as AccountType[]).map((t) => (
                    <SelectItem key={t} value={t}>{ACCOUNT_TYPE_LABELS[t]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="institution">Institution</Label>
              <Input id="institution" placeholder="e.g. Chase" value={institution} onChange={(e) => setInstitution(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="balance">{isDebt ? "Current balance owed" : "Current balance"}</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
              <Input
                id="balance"
                type="number"
                step="0.01"
                placeholder="0.00"
                className="pl-7 num"
                value={balance}
                onChange={(e) => setBalance(e.target.value)}
              />
            </div>
          </div>

          {(isDebt || type === "savings" || type === "investment") && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="apr">{isDebt ? "APR (%)" : "Expected APY (%)"}</Label>
                <Input id="apr" type="number" step="0.01" placeholder="0.00" value={apr} onChange={(e) => setApr(e.target.value)} />
              </div>
              {type === "credit" && (
                <div className="space-y-1.5">
                  <Label htmlFor="limit">Credit limit</Label>
                  <Input id="limit" type="number" step="0.01" value={creditLimit} onChange={(e) => setCreditLimit(e.target.value)} />
                </div>
              )}
              {isDebt && (
                <div className="space-y-1.5">
                  <Label htmlFor="min">Min payment</Label>
                  <Input id="min" type="number" step="0.01" value={minimumPayment} onChange={(e) => setMinimumPayment(e.target.value)} />
                </div>
              )}
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Color</Label>
            <div className="flex flex-wrap gap-2">
              {ACCOUNT_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={cn(
                    "size-7 rounded-full ring-offset-2 ring-offset-card transition",
                    color === c ? "ring-2 ring-foreground scale-110" : "hover:scale-110",
                  )}
                  style={{ background: COLOR_HEX[c] }}
                  aria-label={c}
                />
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit">{account ? "Save changes" : "Add account"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function randomColor(): AccountColor {
  return ACCOUNT_COLORS[Math.floor(Math.random() * ACCOUNT_COLORS.length)];
}
