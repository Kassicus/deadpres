"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Wallet,
  ArrowLeftRight,
  Repeat,
  Target,
  TrendingUp,
  Flame,
  CircleDollarSign,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/accounts", label: "Accounts", icon: Wallet },
  { href: "/transactions", label: "Transactions", icon: ArrowLeftRight },
  { href: "/subscriptions", label: "Subscriptions", icon: Repeat },
  { href: "/debt", label: "Debt Payoff", icon: Flame },
  { href: "/savings", label: "Savings", icon: Target },
  { href: "/projections", label: "Projections", icon: TrendingUp },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex w-60 shrink-0 flex-col border-r border-border/60 bg-card/40 backdrop-blur">
      <div className="flex h-16 items-center gap-2 px-5 border-b border-border/50">
        <div className="grid place-items-center size-9 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-lg shadow-violet-500/20">
          <CircleDollarSign className="size-5" strokeWidth={2.5} />
        </div>
        <div className="flex flex-col leading-tight">
          <span className="font-semibold tracking-tight">Dead Pres</span>
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground">money os</span>
        </div>
      </div>

      <nav className="flex flex-col gap-0.5 p-3">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all",
                active
                  ? "bg-accent text-accent-foreground font-medium"
                  : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
              )}
            >
              {active && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-r-full bg-primary" />
              )}
              <Icon className="size-4" />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto p-3">
        <div className="rounded-xl border border-border/60 bg-gradient-to-br from-card to-accent/30 p-4">
          <div className="text-xs font-medium text-muted-foreground">Tip of the day</div>
          <p className="mt-1 text-xs text-foreground/80 leading-relaxed">
            Pay more than the minimum on your highest-APR card to slash interest fastest.
          </p>
        </div>
      </div>
    </aside>
  );
}
