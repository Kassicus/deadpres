"use client";

import { Topbar } from "@/components/shell/topbar";
import { NetWorthCard } from "@/components/dashboard/net-worth-card";
import { AccountTiles } from "@/components/dashboard/account-tiles";
import { CashflowCard } from "@/components/dashboard/cashflow-card";
import { SpendingDonut } from "@/components/dashboard/spending-donut";
import { RecentTransactions } from "@/components/dashboard/recent-transactions";
import { UpcomingBills } from "@/components/dashboard/upcoming-bills";
import { DebtOverview } from "@/components/dashboard/debt-overview";
import { SavingsProgress } from "@/components/dashboard/savings-progress";

export default function DashboardPage() {
  return (
    <>
      <Topbar title="Hey there 👋" description="Here's where your money stands today." />
      <main className="px-4 lg:px-8 py-6 space-y-6 max-w-[1400px] w-full mx-auto">
        <NetWorthCard />
        <AccountTiles />
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <CashflowCard />
          <SpendingDonut />
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2">
            <RecentTransactions />
          </div>
          <div className="space-y-6">
            <UpcomingBills />
          </div>
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <DebtOverview />
          <SavingsProgress />
        </div>
      </main>
    </>
  );
}
