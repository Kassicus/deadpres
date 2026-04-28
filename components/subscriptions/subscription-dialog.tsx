"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useFinance } from "@/lib/store";
import type { AccountColor, RecurrenceFrequency, Subscription } from "@/lib/types";
import { ACCOUNT_COLORS, COLOR_HEX } from "@/lib/colors";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ICON_MAP } from "@/lib/icons";

const FREQUENCY_LABELS: Record<RecurrenceFrequency, string> = {
  daily: "Daily",
  weekly: "Weekly",
  biweekly: "Every 2 weeks",
  monthly: "Monthly",
  quarterly: "Quarterly",
  yearly: "Yearly",
};

const ICON_OPTIONS = [
  "Tv", "Music", "Cloud", "Sparkles", "Newspaper", "Dumbbell", "Coffee", "Plane", "Palette", "Repeat",
];

interface Props {
  open: boolean;
  onOpenChange: (b: boolean) => void;
  subscription?: Subscription;
}

export function SubscriptionDialog({ open, onOpenChange, subscription }: Props) {
  const accounts = useFinance((s) => s.accounts);
  const addSubscription = useFinance((s) => s.addSubscription);
  const updateSubscription = useFinance((s) => s.updateSubscription);

  const [name, setName] = React.useState("");
  const [amount, setAmount] = React.useState("");
  const [frequency, setFrequency] = React.useState<RecurrenceFrequency>("monthly");
  const [accountId, setAccountId] = React.useState<string>("");
  const [nextChargeDate, setNextChargeDate] = React.useState("");
  const [color, setColor] = React.useState<AccountColor>("violet");
  const [icon, setIcon] = React.useState("Repeat");

  React.useEffect(() => {
    if (open) {
      setName(subscription?.name ?? "");
      setAmount(subscription?.amount != null ? String(subscription.amount) : "");
      setFrequency(subscription?.frequency ?? "monthly");
      setAccountId(subscription?.accountId ?? accounts[0]?.id ?? "");
      setNextChargeDate(subscription?.nextChargeDate?.slice(0, 10) ?? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10));
      setColor(subscription?.color ?? "violet");
      setIcon(subscription?.icon ?? "Repeat");
    }
  }, [open, subscription, accounts]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const a = parseFloat(amount);
    if (!name.trim() || !Number.isFinite(a) || a <= 0) {
      toast.error("Add a name and a valid amount");
      return;
    }
    const payload = {
      name: name.trim(),
      amount: a,
      frequency,
      category: "subscriptions",
      accountId: accountId || undefined,
      nextChargeDate: new Date(nextChargeDate).toISOString(),
      startDate: subscription?.startDate ?? new Date().toISOString(),
      active: subscription?.active ?? true,
      color,
      icon,
    };
    if (subscription) {
      updateSubscription(subscription.id, payload);
      toast.success("Subscription updated");
    } else {
      addSubscription(payload);
      toast.success("Subscription added");
    }
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{subscription ? "Edit subscription" : "New subscription"}</DialogTitle>
          <DialogDescription>Track recurring charges so they never sneak up on you.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-[auto_1fr] gap-3">
            <div className="space-y-1.5">
              <Label>Icon</Label>
              <Select value={icon} onValueChange={setIcon}>
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ICON_OPTIONS.map((i) => {
                    const I = ICON_MAP[i];
                    return (
                      <SelectItem key={i} value={i}>
                        <span className="flex items-center gap-2">
                          <I className="size-4" /> {i}
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sub-name">Name</Label>
              <Input id="sub-name" placeholder="e.g. Netflix" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="sub-amount">Amount</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                <Input
                  id="sub-amount"
                  type="number"
                  step="0.01"
                  className="pl-7 num"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Frequency</Label>
              <Select value={frequency} onValueChange={(v) => setFrequency(v as RecurrenceFrequency)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(FREQUENCY_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="sub-next">Next charge</Label>
              <Input id="sub-next" type="date" value={nextChargeDate} onChange={(e) => setNextChargeDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Account</Label>
              <Select value={accountId} onValueChange={setAccountId}>
                <SelectTrigger><SelectValue placeholder="Pick account" /></SelectTrigger>
                <SelectContent>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

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
            <Button type="submit">{subscription ? "Save changes" : "Add subscription"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
