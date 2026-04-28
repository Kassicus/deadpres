"use client";

import { Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFinance } from "@/lib/store";

export function WelcomeBanner() {
  const hydrated = useFinance((s) => s.hydrated);
  const accounts = useFinance((s) => s.accounts);
  const seedDemo = useFinance((s) => s.seedDemo);
  const hasSeeded = useFinance((s) => s.hasSeeded);

  if (!hydrated) return null;
  if (accounts.length > 0 || hasSeeded) return null;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-violet-500/5 to-mint/10 p-6 mb-6">
      <div className="absolute inset-0 dot-pattern opacity-30 pointer-events-none" />
      <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="size-12 rounded-xl bg-primary/15 grid place-items-center text-primary shrink-0">
          <Sparkles className="size-6" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold tracking-tight">Welcome to your money OS</h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            Your data lives in your browser — private by default. Want to play with sample data first?
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button onClick={seedDemo} className="gap-1.5">
            <Sparkles />
            Load demo data
          </Button>
        </div>
      </div>
    </div>
  );
}
