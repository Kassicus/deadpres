"use client";

import * as React from "react";
import { Plus, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { useFinance } from "@/lib/store";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { AddTransactionDialog } from "@/components/transactions/add-transaction-dialog";
import { toast } from "sonner";

export function Topbar({ title, description }: { title: string; description?: string }) {
  const seedDemo = useFinance((s) => s.seedDemo);
  const reset = useFinance((s) => s.reset);
  const hasSeeded = useFinance((s) => s.hasSeeded);
  const [open, setOpen] = React.useState(false);

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border/50 bg-background/70 backdrop-blur-xl px-4 lg:px-8">
      <div className="flex flex-col leading-tight min-w-0">
        <h1 className="text-base font-semibold tracking-tight truncate">{title}</h1>
        {description && (
          <p className="text-xs text-muted-foreground truncate">{description}</p>
        )}
      </div>

      <div className="ml-auto flex items-center gap-2">
        <Button onClick={() => setOpen(true)} size="sm" className="gap-1.5">
          <Plus />
          <span className="hidden sm:inline">Add transaction</span>
          <span className="sm:hidden">Add</span>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Menu">
              <Sparkles />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Sample data</DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() => {
                seedDemo();
                toast.success("Demo data loaded");
              }}
            >
              <Sparkles />
              {hasSeeded ? "Reload demo data" : "Load demo data"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => {
                if (confirm("Clear all data? This cannot be undone.")) {
                  reset();
                  toast.success("All data cleared");
                }
              }}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 />
              Reset everything
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <ThemeToggle />
      </div>

      <AddTransactionDialog open={open} onOpenChange={setOpen} />
    </header>
  );
}
