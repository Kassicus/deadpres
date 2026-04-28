import type { Category } from "./types";

export const DEFAULT_CATEGORIES: Category[] = [
  { id: "groceries", name: "Groceries", group: "essentials", color: "mint", icon: "ShoppingCart" },
  { id: "rent", name: "Rent / Mortgage", group: "essentials", color: "violet", icon: "Home" },
  { id: "utilities", name: "Utilities", group: "essentials", color: "sky", icon: "Zap" },
  { id: "internet", name: "Internet & Phone", group: "essentials", color: "sky", icon: "Wifi" },
  { id: "insurance", name: "Insurance", group: "essentials", color: "stone", icon: "ShieldCheck" },
  { id: "transport", name: "Transportation", group: "essentials", color: "amber", icon: "Car" },
  { id: "fuel", name: "Fuel", group: "essentials", color: "amber", icon: "Fuel" },
  { id: "health", name: "Health", group: "essentials", color: "coral", icon: "HeartPulse" },

  { id: "dining", name: "Dining Out", group: "lifestyle", color: "coral", icon: "UtensilsCrossed" },
  { id: "coffee", name: "Coffee", group: "lifestyle", color: "amber", icon: "Coffee" },
  { id: "shopping", name: "Shopping", group: "lifestyle", color: "rose", icon: "ShoppingBag" },
  { id: "entertainment", name: "Entertainment", group: "lifestyle", color: "violet", icon: "Clapperboard" },
  { id: "subscriptions", name: "Subscriptions", group: "lifestyle", color: "violet", icon: "Repeat" },
  { id: "fitness", name: "Fitness", group: "lifestyle", color: "lime", icon: "Dumbbell" },
  { id: "travel", name: "Travel", group: "lifestyle", color: "sky", icon: "Plane" },
  { id: "personal", name: "Personal Care", group: "lifestyle", color: "rose", icon: "Sparkles" },

  { id: "salary", name: "Salary", group: "income", color: "mint", icon: "Briefcase" },
  { id: "freelance", name: "Freelance", group: "income", color: "mint", icon: "Laptop" },
  { id: "interest", name: "Interest", group: "income", color: "lime", icon: "TrendingUp" },
  { id: "refund", name: "Refund", group: "income", color: "lime", icon: "RotateCcw" },

  { id: "savings-deposit", name: "Savings", group: "savings", color: "mint", icon: "PiggyBank" },
  { id: "investment", name: "Investment", group: "savings", color: "violet", icon: "LineChart" },

  { id: "credit-payment", name: "Credit Payment", group: "debt", color: "coral", icon: "CreditCard" },
  { id: "loan-payment", name: "Loan Payment", group: "debt", color: "stone", icon: "Banknote" },

  { id: "other", name: "Other", group: "other", color: "stone", icon: "MoreHorizontal" },
];

export function getCategory(id: string): Category {
  return DEFAULT_CATEGORIES.find((c) => c.id === id) ?? DEFAULT_CATEGORIES[DEFAULT_CATEGORIES.length - 1];
}
