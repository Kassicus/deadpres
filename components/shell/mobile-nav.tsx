"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Wallet,
  ArrowLeftRight,
  Repeat,
  Flame,
  Target,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Home", icon: LayoutDashboard },
  { href: "/accounts", label: "Accts", icon: Wallet },
  { href: "/transactions", label: "Tx", icon: ArrowLeftRight },
  { href: "/subscriptions", label: "Subs", icon: Repeat },
  { href: "/debt", label: "Debt", icon: Flame },
  { href: "/savings", label: "Goals", icon: Target },
  { href: "/projections", label: "Grow", icon: TrendingUp },
];

export function MobileNav() {
  const pathname = usePathname();
  return (
    <nav className="lg:hidden sticky bottom-0 z-30 border-t border-border/60 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/70">
      <div className="grid grid-cols-7">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] transition-colors",
                active ? "text-primary" : "text-muted-foreground",
              )}
            >
              <Icon className="size-4" />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
