"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useFinance } from "@/lib/store";
import type { AccountColor, SavingsGoal } from "@/lib/types";
import { ACCOUNT_COLORS, COLOR_HEX } from "@/lib/colors";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ICON_MAP } from "@/lib/icons";

const ICON_OPTIONS = ["ShieldCheck", "Plane", "Laptop", "Home", "Car", "PiggyBank", "Sparkles", "Target"];

interface Props {
  open: boolean;
  onOpenChange: (b: boolean) => void;
  goal?: SavingsGoal;
}

export function GoalDialog({ open, onOpenChange, goal }: Props) {
  const accounts = useFinance((s) => s.accounts);
  const addGoal = useFinance((s) => s.addGoal);
  const updateGoal = useFinance((s) => s.updateGoal);

  const [name, setName] = React.useState("");
  const [target, setTarget] = React.useState("");
  const [current, setCurrent] = React.useState("");
  const [contribution, setContribution] = React.useState("");
  const [targetDate, setTargetDate] = React.useState("");
  const [accountId, setAccountId] = React.useState<string>("");
  const [color, setColor] = React.useState<AccountColor>("mint");
  const [icon, setIcon] = React.useState("Target");

  React.useEffect(() => {
    if (open) {
      setName(goal?.name ?? "");
      setTarget(goal?.targetAmount != null ? String(goal.targetAmount) : "");
      setCurrent(goal?.currentAmount != null ? String(goal.currentAmount) : "0");
      setContribution(goal?.monthlyContribution != null ? String(goal.monthlyContribution) : "");
      setTargetDate(goal?.targetDate?.slice(0, 10) ?? "");
      setAccountId(goal?.accountId ?? "");
      setColor(goal?.color ?? "mint");
      setIcon(goal?.icon ?? "Target");
    }
  }, [open, goal]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const t = parseFloat(target);
    const c = parseFloat(current) || 0;
    if (!name.trim() || !Number.isFinite(t) || t <= 0) {
      toast.error("Add a name and target amount");
      return;
    }
    const payload = {
      name: name.trim(),
      targetAmount: t,
      currentAmount: c,
      monthlyContribution: contribution ? parseFloat(contribution) : undefined,
      targetDate: targetDate ? new Date(targetDate).toISOString() : undefined,
      accountId: accountId || undefined,
      color,
      icon,
    };
    if (goal) {
      updateGoal(goal.id, payload);
      toast.success("Goal updated");
    } else {
      addGoal(payload);
      toast.success("Goal added");
    }
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{goal ? "Edit goal" : "New savings goal"}</DialogTitle>
          <DialogDescription>What are you saving for? Set a target and an optional monthly contribution.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-[auto_1fr] gap-3">
            <div className="space-y-1.5">
              <Label>Icon</Label>
              <Select value={icon} onValueChange={setIcon}>
                <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ICON_OPTIONS.map((i) => {
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
              <Label htmlFor="goal-name">Name</Label>
              <Input id="goal-name" placeholder="e.g. Japan Trip" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="goal-target">Target</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                <Input id="goal-target" type="number" step="0.01" className="pl-7 num" value={target} onChange={(e) => setTarget(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="goal-current">Saved so far</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                <Input id="goal-current" type="number" step="0.01" className="pl-7 num" value={current} onChange={(e) => setCurrent(e.target.value)} />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="goal-contrib">Monthly contribution</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                <Input id="goal-contrib" type="number" step="0.01" className="pl-7 num" placeholder="0" value={contribution} onChange={(e) => setContribution(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="goal-date">Target date</Label>
              <Input id="goal-date" type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
            </div>
          </div>

          {accounts.length > 0 && (
            <div className="space-y-1.5">
              <Label>Backing account (optional)</Label>
              <Select value={accountId || "none"} onValueChange={(v) => setAccountId(v === "none" ? "" : v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
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
            <Button type="submit">{goal ? "Save changes" : "Add goal"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
