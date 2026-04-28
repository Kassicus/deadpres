"use client";

import * as React from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "sonner";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <TooltipProvider delayDuration={150}>
      {children}
      <Toaster
        position="bottom-right"
        toastOptions={{
          className: "rounded-xl border border-border bg-card text-card-foreground shadow-xl",
        }}
      />
    </TooltipProvider>
  );
}
