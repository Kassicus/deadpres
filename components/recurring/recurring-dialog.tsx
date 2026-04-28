"use client";

import * as React from "react";
import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useFinance } from "@/lib/store";
import type { AccountColor, RecurringDirection, RecurringPayment } from "@/lib/types";
import { ACCOUNT_COLORS, COLOR_HEX } from "@/lib/colors";
import { DEFAULT_CATEGORIES } from "@/lib/categories";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ICON_MAP } from "@/lib/icons";
import { ScheduleEditor, defaultSchedule } from "./schedule-editor";
import { nextOccurrence, type Schedule } from "@/lib/schedule";

const ICON_OPTIONS_EXPENSE = [
  "Repeat", "Tv", "Music", "Cloud", "Sparkles", "Newspaper", "Dumbbell", "Coffee", "Plane", "Palette",
  "Home", "Zap", "Wifi", "ShieldCheck", "Car", "Fuel", "HeartPulse", "Building2",
];

const ICON_OPTIONS_INCOME = [
  "Briefcase", "Laptop", "TrendingUp", "Sparkles", "Banknote", "PiggyBank", "RotateCcw",
];

interface Props {
  open: boolean;
  onOpenChange: (b: boolean) => void;
  recurring?: RecurringPayment;
  defaultDirection?: RecurringDirection;
}

export function RecurringDialog({ open, onOpenChange, recurring, defaultDirection }: Props) {
  const accounts = useFinance((s) => s.accounts);
  const addRecurringPayment = useFinance((s) => s.addRecurringPayment);
  const updateRecurringPayment = useFinance((s) => s.updateRecurringPayment);

  const [direction, setDirection] = React.useState<RecurringDirection>("expense");
  const [name, setName] = React.useState("");
  const [amount, setAmount] = React.useState("");
  const [schedule, setSchedule] = React.useState<Schedule>(defaultSchedule());
  const [category, setCategory] = React.useState("subscriptions");
  const [accountId, setAccountId] = React.useState<string>("");
  const [color, setColor] = React.useState<AccountColor>("violet");
  const [icon, setIcon] = React.useState("Repeat");

  React.useEffect(() => {
    if (open) {
      const dir = recurring?.direction ?? defaultDirection ?? "expense";
      setDirection(dir);
      setName(recurring?.name ?? "");
      setAmount(recurring?.amount != null ? String(recurring.amount) : "");
      setSchedule(recurring?.schedule ?? defaultSchedule());
      setCategory(recurring?.category ?? (dir === "income" ? "salary" : "subscriptions"));
      setAccountId(recurring?.accountId ?? accounts[0]?.id ?? "");
      setColor(recurring?.color ?? (dir === "income" ? "mint" : "violet"));
      setIcon(recurring?.icon ?? (dir === "income" ? "Briefcase" : "Repeat"));
    }
  }, [open, recurring, defaultDirection, accounts]);

  // When user flips direction, swap default category/icon if it doesn't make sense for the other side.
  React.useEffect(() => {
    if (direction === "income") {
      if (!DEFAULT_CATEGORIES.find((c) => c.id === category && c.group === "income")) {
        setCategory("salary");
      }
      if (!ICON_OPTIONS_INCOME.includes(icon)) setIcon("Briefcase");
    } else {
      if (DEFAULT_CATEGORIES.find((c) => c.id === category)?.group === "income") {
        setCategory("subscriptions");
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [direction]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const a = parseFloat(amount);
    if (!name.trim() || !Number.isFinite(a) || a <= 0) {
      toast.error("Add a name and a valid amount");
      return;
    }
    const next = nextOccurrence(schedule);
    const payload: Omit<RecurringPayment, "id" | "createdAt"> = {
      name: name.trim(),
      amount: a,
      direction,
      schedule,
      category,
      accountId: accountId || undefined,
      nextChargeDate: next.toISOString(),
      startDate: recurring?.startDate ?? new Date().toISOString(),
      active: recurring?.active ?? true,
      color,
      icon,
      postedThrough: recurring?.postedThrough,
    };
    if (recurring) {
      updateRecurringPayment(recurring.id, payload);
      toast.success("Updated");
    } else {
      addRecurringPayment(payload);
      toast.success("Added");
    }
    onOpenChange(false);
  }

  const iconOptions = direction === "income" ? ICON_OPTIONS_INCOME : ICON_OPTIONS_EXPENSE;
  const categoryOptions = DEFAULT_CATEGORIES.filter((c) =>
    direction === "income" ? c.group === "income" : c.group !== "income",
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{recurring ? "Edit recurring" : "New recurring payment"}</DialogTitle>
          <DialogDescription>
            Bills, subscriptions, paychecks — anything that happens on a schedule.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Tabs value={direction} onValueChange={(v) => setDirection(v as RecurringDirection)}>
            <TabsList className="w-full grid grid-cols-2">
              <TabsTrigger value="expense" className="gap-1.5">
                <ArrowUpRight className="size-3.5" /> Expense
              </TabsTrigger>
              <TabsTrigger value="income" className="gap-1.5">
                <ArrowDownLeft className="size-3.5" /> Income
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="grid grid-cols-[auto_1fr] gap-3">
            <div className="space-y-1.5">
              <Label>Icon</Label>
              <Select value={icon} onValueChange={setIcon}>
                <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-72">
                  {iconOptions.map((i) => {
                    const I = ICON_MAP[i];
                    return (
                      <SelectItem key={i} value={i}>
                        <span className="flex items-center gap-2">
                          {I && <I className="size-4" />} {i}
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rec-name">Name</Label>
              <Input
                id="rec-name"
                placeholder={direction === "income" ? "e.g. Salary" : "e.g. Netflix or Rent"}
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="rec-amount">Amount</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                <Input
                  id="rec-amount"
                  type="number"
                  step="0.01"
                  className="pl-7 num"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-72">
                  {categoryOptions.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <ScheduleEditor value={schedule} onChange={setSchedule} />

          {accounts.length > 0 && (
            <div className="space-y-1.5">
              <Label>{direction === "income" ? "Deposit into" : "Charged from"}</Label>
              <Select value={accountId} onValueChange={setAccountId}>
                <SelectTrigger><SelectValue placeholder="Pick account" /></SelectTrigger>
                <SelectContent>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
            <Button type="submit">{recurring ? "Save changes" : "Add"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
