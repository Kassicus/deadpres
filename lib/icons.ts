import {
  Wallet,
  CreditCard,
  Banknote,
  PiggyBank,
  LineChart,
  ShoppingCart,
  Home,
  Zap,
  Wifi,
  ShieldCheck,
  Car,
  Fuel,
  HeartPulse,
  UtensilsCrossed,
  Coffee,
  ShoppingBag,
  Clapperboard,
  Repeat,
  Dumbbell,
  Plane,
  Sparkles,
  Briefcase,
  Laptop,
  TrendingUp,
  RotateCcw,
  MoreHorizontal,
  Tv,
  Music,
  Cloud,
  Palette,
  Newspaper,
  Building2,
  type LucideIcon,
} from "lucide-react";
import type { AccountType } from "./types";

export const ICON_MAP: Record<string, LucideIcon> = {
  Wallet,
  CreditCard,
  Banknote,
  PiggyBank,
  LineChart,
  ShoppingCart,
  Home,
  Zap,
  Wifi,
  ShieldCheck,
  Car,
  Fuel,
  HeartPulse,
  UtensilsCrossed,
  Coffee,
  ShoppingBag,
  Clapperboard,
  Repeat,
  Dumbbell,
  Plane,
  Sparkles,
  Briefcase,
  Laptop,
  TrendingUp,
  RotateCcw,
  MoreHorizontal,
  Tv,
  Music,
  Cloud,
  Palette,
  Newspaper,
  Building2,
};

export function getIcon(name?: string): LucideIcon {
  if (!name) return MoreHorizontal;
  return ICON_MAP[name] ?? MoreHorizontal;
}

export function accountIcon(type: AccountType): LucideIcon {
  switch (type) {
    case "checking": return Wallet;
    case "savings": return PiggyBank;
    case "credit": return CreditCard;
    case "loan": return Banknote;
    case "investment": return LineChart;
    case "cash": return Wallet;
    default: return Building2;
  }
}

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  checking: "Checking",
  savings: "Savings",
  credit: "Credit Card",
  loan: "Loan",
  investment: "Investment",
  cash: "Cash",
  other: "Other",
};
