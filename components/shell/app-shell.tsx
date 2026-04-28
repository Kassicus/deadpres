"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/shell/sidebar";
import { MobileNav } from "@/components/shell/mobile-nav";

const NO_CHROME_PATHS = ["/login", "/auth", "/onboarding"];

export function AppShell({
  hasUser,
  children,
}: {
  hasUser: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const noChrome = !hasUser || NO_CHROME_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  if (noChrome) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0 relative">
        <div className="absolute inset-0 -z-10 gradient-mesh opacity-40 pointer-events-none" />
        <div className="flex-1 flex flex-col min-w-0">{children}</div>
        <MobileNav />
      </div>
    </div>
  );
}
