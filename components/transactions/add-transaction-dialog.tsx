"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useFinance } from "@/lib/store";
import { DEFAULT_CATEGORIES } from "@/lib/categories";
import type { TransactionType } from "@/lib/types";
import { toast } from "sonner";
import { ArrowDownLeft, ArrowUpRight, ArrowLeftRight } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (b: boolean) => void;
  defaultAccountId?: string;
}

export function AddTransactionDialog({ open, onOpenChange, defaultAccountId }: Props) {
  const accounts = useFinance((s) => s.accounts);
  const addTransaction = useFinance((s) => s.addTransaction);

  const [type, setType] = React.useState<TransactionType>("expense");
  const [amount, setAmount] = React.useState("");
  const [accountId, setAccountId] = React.useState(defaultAccountId ?? "");
  const [toAccountId, setToAccountId] = React.useState("");
  const [category, setCategory] = React.useState("groceries");
  const [merchant, setMerchant] = React.useState("");
  const [date, setDate] = React.useState(() => new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = React.useState("");

  React.useEffect(() => {
    if (open) {
      setType("expense");
      setAmount("");
      setAccountId(defaultAccountId ?? accounts[0]?.id ?? "");
      setToAccountId("");
      setCategory("groceries");
      setMerchant("");
      setDate(new Date().toISOString().slice(0, 10));
      setNotes("");
    }
  }, [open, defaultAccountId, accounts]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const n = parseFloat(amount);
    if (!Number.isFinite(n) || n <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    if (!accountId) {
      toast.error("Pick an account");
      return;
    }
    if (type === "transfer" && !toAccountId) {
      toast.error("Pick a destination account");
      return;
    }
    addTransaction({
      accountId,
      toAccountId: type === "transfer" ? toAccountId : undefined,
      amount: n,
      type,
      category: type === "transfer" ? "savings-deposit" : category,
      merchant: merchant || undefined,
      date: new Date(date).toISOString(),
      notes: notes || undefined,
    });
    toast.success("Transaction added");
    onOpenChange(false);
  }

  if (accounts.length === 0) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add an account first</DialogTitle>
            <DialogDescription>You need at least one account before logging transactions.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New transaction</DialogTitle>
          <DialogDescription>Log an expense, income, or a transfer between accounts.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Tabs value={type} onValueChange={(v) => setType(v as TransactionType)}>
            <TabsList className="w-full grid grid-cols-3">
              <TabsTrigger value="expense" className="gap-1.5"><ArrowUpRight className="size-3.5" /> Expense</TabsTrigger>
              <TabsTrigger value="income" className="gap-1.5"><ArrowDownLeft className="size-3.5" /> Income</TabsTrigger>
              <TabsTrigger value="transfer" className="gap-1.5"><ArrowLeftRight className="size-3.5" /> Transfer</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="space-y-1.5">
            <Label htmlFor="amount">Amount</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
              <Input
                id="amount"
                type="number"
                inputMode="decimal"
                step="0.01"
                placeholder="0.00"
                className="pl-7 text-lg num font-semibold"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                autoFocus
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{type === "transfer" ? "From" : "Account"}</Label>
              <Select value={accountId} onValueChange={setAccountId}>
                <SelectTrigger><SelectValue placeholder="Pick account" /></SelectTrigger>
                <SelectContent>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {type === "transfer" ? (
              <div className="space-y-1.5">
                <Label>To</Label>
                <Select value={toAccountId} onValueChange={setToAccountId}>
                  <SelectTrigger><SelectValue placeholder="Destination" /></SelectTrigger>
                  <SelectContent>
                    {accounts.filter((a) => a.id !== accountId).map((a) => (
                      <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent className="max-h-72">
                    {DEFAULT_CATEGORIES.filter((c) =>
                      type === "income" ? c.group === "income" || c.group === "savings" : c.group !== "income",
                    ).map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            {type !== "transfer" && (
              <div className="space-y-1.5">
                <Label htmlFor="merchant">Merchant</Label>
                <Input id="merchant" placeholder="e.g. Whole Foods" value={merchant} onChange={(e) => setMerchant(e.target.value)} />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="date">Date</Label>
              <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" placeholder="Optional" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit">Add transaction</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
