"use client";

import { Wallet, PiggyBank, CreditCard, LineChart } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useFinance } from "@/lib/store";
import { formatCurrency } from "@/lib/format";

export function AccountTiles() {
  const accounts = useFinance((s) => s.accounts);

  const groups = {
    cash: accounts.filter((a) => a.type === "checking" || a.type === "cash"),
    savings: accounts.filter((a) => a.type === "savings"),
    debt: accounts.filter((a) => a.type === "credit" || a.type === "loan"),
    investments: accounts.filter((a) => a.type === "investment"),
  };

  const sums = {
    cash: groups.cash.reduce((s, a) => s + a.balance, 0),
    savings: groups.savings.reduce((s, a) => s + a.balance, 0),
    debt: groups.debt.reduce((s, a) => s + a.balance, 0),
    investments: groups.investments.reduce((s, a) => s + a.balance, 0),
  };

  const tiles = [
    { key: "cash", label: "Cash", value: sums.cash, count: groups.cash.length, icon: Wallet, color: "var(--sky)", tint: "from-sky/10 to-transparent" },
    { key: "savings", label: "Savings", value: sums.savings, count: groups.savings.length, icon: PiggyBank, color: "var(--mint)", tint: "from-mint/10 to-transparent" },
    { key: "investments", label: "Investments", value: sums.investments, count: groups.investments.length, icon: LineChart, color: "var(--violet)", tint: "from-violet/10 to-transparent" },
    { key: "debt", label: "Debt", value: -sums.debt, count: groups.debt.length, icon: CreditCard, color: "var(--coral)", tint: "from-coral/10 to-transparent" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {tiles.map((t) => {
        const Icon = t.icon;
        return (
          <Card key={t.key} className="relative overflow-hidden p-4 hover:shadow-md transition-shadow">
            <div className={`absolute inset-0 bg-gradient-to-br ${t.tint} pointer-events-none`} />
            <div className="relative">
              <div className="flex items-center justify-between">
                <div
                  className="size-8 rounded-lg grid place-items-center"
                  style={{ background: `color-mix(in oklch, ${t.color} 18%, transparent)`, color: t.color }}
                >
                  <Icon className="size-4" />
                </div>
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground">{t.count} {t.count === 1 ? "acct" : "accts"}</span>
              </div>
              <div className="mt-3 text-xs text-muted-foreground">{t.label}</div>
              <div className="text-xl font-semibold tracking-tight num">
                {formatCurrency(t.value)}
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
