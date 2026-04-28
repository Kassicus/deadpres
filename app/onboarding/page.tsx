"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Check,
  CircleDollarSign,
  CreditCard,
  PiggyBank,
  Sparkles,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useFinance } from "@/lib/store";
import { useAuth } from "@/components/auth/auth-provider";
import { createClient } from "@/lib/supabase/client";
import type { AccountColor, AccountType } from "@/lib/types";
import { ACCOUNT_COLORS, COLOR_HEX } from "@/lib/colors";
import { ACCOUNT_TYPE_LABELS } from "@/lib/icons";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Step = "welcome" | "account" | "transaction" | "tour" | "done";

export default function OnboardingPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [step, setStep] = React.useState<Step>("welcome");

  // Account form state
  const [accName, setAccName] = React.useState("Everyday Checking");
  const [accType, setAccType] = React.useState<AccountType>("checking");
  const [accBalance, setAccBalance] = React.useState("");
  const [accColor, setAccColor] = React.useState<AccountColor>("violet");

  // Transaction form state
  const [txMerchant, setTxMerchant] = React.useState("");
  const [txAmount, setTxAmount] = React.useState("");

  const [creating, setCreating] = React.useState(false);
  const addAccount = useFinance((s) => s.addAccount);
  const addTransaction = useFinance((s) => s.addTransaction);
  const accounts = useFinance((s) => s.accounts);
  const firstAccount = accounts[0];

  async function handleCreateAccount() {
    const balance = parseFloat(accBalance) || 0;
    if (!accName.trim()) {
      toast.error("Give your account a name");
      return;
    }
    setCreating(true);
    const acc = await addAccount({
      name: accName.trim(),
      type: accType,
      balance,
      color: accColor,
    });
    setCreating(false);
    if (acc) {
      toast.success("Account created");
      setStep("transaction");
    }
  }

  async function handleCreateTransaction() {
    if (!firstAccount) return;
    const amount = parseFloat(txAmount);
    if (!txMerchant.trim() || !Number.isFinite(amount) || amount <= 0) {
      toast.error("Enter a merchant and amount");
      return;
    }
    setCreating(true);
    const tx = await addTransaction({
      accountId: firstAccount.id,
      amount,
      type: "expense",
      category: "groceries",
      merchant: txMerchant.trim(),
      date: new Date().toISOString(),
    });
    setCreating(false);
    if (tx) {
      toast.success("Transaction logged");
      setStep("tour");
    }
  }

  async function handleSkipTransaction() {
    setStep("tour");
  }

  async function handleFinish() {
    if (!user) return;
    const supabase = createClient();
    await supabase.from("profiles").update({ has_onboarded: true }).eq("id", user.id);
    router.push("/");
  }

  return (
    <main className="min-h-screen relative overflow-hidden">
      <div className="absolute inset-0 gradient-mesh opacity-50 pointer-events-none" />
      <div className="absolute inset-0 dot-pattern opacity-15 pointer-events-none" />

      <div className="relative max-w-2xl mx-auto px-4 py-10 lg:py-20">
        <Stepper current={step} />

        {step === "welcome" && (
          <Card className="p-8 lg:p-10 text-center">
            <div className="grid place-items-center size-16 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-xl shadow-violet-500/30 mx-auto mb-5">
              <CircleDollarSign className="size-8" strokeWidth={2.5} />
            </div>
            <h1 className="text-3xl lg:text-4xl font-semibold tracking-tight">Welcome to Dead Pres</h1>
            <p className="text-muted-foreground mt-3 max-w-md mx-auto leading-relaxed">
              Track every dollar, slay your debt, and watch your money grow. Let's get you set up in under a minute.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-8 text-left">
              <Pillar icon={Wallet} label="Track" tint="var(--sky)">All your accounts, one place.</Pillar>
              <Pillar icon={CreditCard} label="Pay off" tint="var(--coral)">Avalanche, snowball, you choose.</Pillar>
              <Pillar icon={TrendingUp} label="Grow" tint="var(--mint)">Project where it could land.</Pillar>
            </div>

            <Button onClick={() => setStep("account")} size="lg" className="mt-8 gap-2">
              Let's go <ArrowRight />
            </Button>
          </Card>
        )}

        {step === "account" && (
          <Card className="p-8 lg:p-10">
            <h2 className="text-2xl font-semibold tracking-tight">Add your first account</h2>
            <p className="text-muted-foreground mt-1.5 text-sm">
              Start with the account you use most — checking is a great pick. You can add more later.
            </p>

            <div className="space-y-4 mt-6">
              <div className="space-y-1.5">
                <Label htmlFor="ob-name">Name</Label>
                <Input id="ob-name" value={accName} onChange={(e) => setAccName(e.target.value)} autoFocus />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Type</Label>
                  <Select value={accType} onValueChange={(v) => setAccType(v as AccountType)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(Object.keys(ACCOUNT_TYPE_LABELS) as AccountType[]).map((t) => (
                        <SelectItem key={t} value={t}>{ACCOUNT_TYPE_LABELS[t]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ob-balance">Current balance</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                    <Input id="ob-balance" type="number" step="0.01" placeholder="0.00" className="pl-7 num" value={accBalance} onChange={(e) => setAccBalance(e.target.value)} />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Color</Label>
                <div className="flex flex-wrap gap-2">
                  {ACCOUNT_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setAccColor(c)}
                      className={cn(
                        "size-7 rounded-full ring-offset-2 ring-offset-card transition",
                        accColor === c ? "ring-2 ring-foreground scale-110" : "hover:scale-110",
                      )}
                      style={{ background: COLOR_HEX[c] }}
                      aria-label={c}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center mt-8">
              <Button variant="ghost" onClick={() => setStep("welcome")}>Back</Button>
              <Button onClick={handleCreateAccount} disabled={creating} className="gap-2">
                Create account <ArrowRight />
              </Button>
            </div>
          </Card>
        )}

        {step === "transaction" && (
          <Card className="p-8 lg:p-10">
            <h2 className="text-2xl font-semibold tracking-tight">Log your first transaction</h2>
            <p className="text-muted-foreground mt-1.5 text-sm">
              The most recent thing you spent money on works perfectly. We'll show you how it lands on your dashboard.
            </p>

            <div className="space-y-4 mt-6">
              <div className="space-y-1.5">
                <Label htmlFor="ob-merchant">Where</Label>
                <Input id="ob-merchant" placeholder="e.g. Whole Foods" value={txMerchant} onChange={(e) => setTxMerchant(e.target.value)} autoFocus />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ob-tx-amount">How much</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                  <Input id="ob-tx-amount" type="number" step="0.01" placeholder="0.00" className="pl-7 num text-lg font-semibold h-11" value={txAmount} onChange={(e) => setTxAmount(e.target.value)} />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                We'll log this as <span className="text-foreground font-medium">Groceries</span> from{" "}
                <span className="text-foreground font-medium">{firstAccount?.name ?? "your account"}</span>. You can always edit later.
              </p>
            </div>

            <div className="flex justify-between items-center mt-8">
              <Button variant="ghost" onClick={handleSkipTransaction}>Skip for now</Button>
              <Button onClick={handleCreateTransaction} disabled={creating} className="gap-2">
                Log it <ArrowRight />
              </Button>
            </div>
          </Card>
        )}

        {step === "tour" && (
          <Card className="p-8 lg:p-10">
            <h2 className="text-2xl font-semibold tracking-tight">You're set up. Here's the lay of the land.</h2>
            <p className="text-muted-foreground mt-1.5 text-sm">
              Three places to know about — everything else builds from these.
            </p>

            <div className="space-y-3 mt-6">
              <TourItem
                icon={Wallet}
                title="Accounts"
                description="Add checking, savings, credit cards, loans — anything that holds or owes money."
                tint="var(--sky)"
              />
              <TourItem
                icon={PiggyBank}
                title="Transactions & Subscriptions"
                description="Log expenses with the “Add transaction” button. Add recurring charges so they never sneak up."
                tint="var(--mint)"
              />
              <TourItem
                icon={Sparkles}
                title="Debt & Projections"
                description="Pick avalanche or snowball to plan your debt payoff. Run what-ifs on your savings growth."
                tint="var(--violet)"
              />
            </div>

            <div className="flex justify-between items-center mt-8">
              <Button variant="ghost" onClick={() => setStep("transaction")}>Back</Button>
              <Button onClick={handleFinish} className="gap-2">
                Take me to my dashboard <ArrowRight />
              </Button>
            </div>
          </Card>
        )}
      </div>
    </main>
  );
}

function Stepper({ current }: { current: Step }) {
  const steps: Step[] = ["welcome", "account", "transaction", "tour"];
  const idx = steps.indexOf(current);
  return (
    <div className="flex items-center gap-2 mb-6 justify-center">
      {steps.map((s, i) => (
        <div
          key={s}
          className={cn(
            "h-1 rounded-full transition-all",
            i < idx ? "w-8 bg-primary" : i === idx ? "w-12 bg-primary" : "w-6 bg-muted",
          )}
        />
      ))}
    </div>
  );
}

function Pillar({
  icon: Icon,
  label,
  tint,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  tint: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-card/60 p-4">
      <div
        className="size-8 rounded-lg grid place-items-center mb-3"
        style={{ background: `color-mix(in oklch, ${tint} 18%, transparent)`, color: tint }}
      >
        <Icon className="size-4" />
      </div>
      <div className="font-medium text-sm">{label}</div>
      <div className="text-xs text-muted-foreground mt-0.5">{children}</div>
    </div>
  );
}

function TourItem({
  icon: Icon,
  title,
  description,
  tint,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  tint: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-border/60 bg-card/60 p-4">
      <div
        className="size-9 rounded-lg grid place-items-center shrink-0"
        style={{ background: `color-mix(in oklch, ${tint} 18%, transparent)`, color: tint }}
      >
        <Icon className="size-4" />
      </div>
      <div className="min-w-0">
        <div className="font-medium">{title}</div>
        <div className="text-sm text-muted-foreground mt-0.5">{description}</div>
      </div>
      <Check className="size-4 text-success shrink-0 mt-1" />
    </div>
  );
}
