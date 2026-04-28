"use client";

import * as React from "react";
import { LogOut, Plus, User as UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { AddTransactionDialog } from "@/components/transactions/add-transaction-dialog";
import { useAuth } from "@/components/auth/auth-provider";

export function Topbar({ title, description }: { title: string; description?: string }) {
  const { user, signOut } = useAuth();
  const [open, setOpen] = React.useState(false);

  const initials = (user?.user_metadata?.full_name as string | undefined)
    ?.split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()
    ?? user?.email?.[0]?.toUpperCase()
    ?? "?";
  const avatarUrl = user?.user_metadata?.avatar_url as string | undefined;
  const displayName = (user?.user_metadata?.full_name as string | undefined) ?? user?.email ?? "Account";

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-2 sm:gap-3 border-b border-border/50 bg-background/70 backdrop-blur-xl px-4 lg:px-8">
      <div className="flex flex-col leading-tight min-w-0 flex-1">
        <h1 className="text-base font-semibold tracking-tight truncate">{title}</h1>
        {description && (
          <p className="text-xs text-muted-foreground truncate hidden sm:block">{description}</p>
        )}
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        <Button onClick={() => setOpen(true)} size="sm" className="gap-1.5">
          <Plus />
          <span className="hidden sm:inline">Add transaction</span>
          <span className="sm:hidden">Add</span>
        </Button>

        <ThemeToggle />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="size-9 rounded-full overflow-hidden border border-border/70 bg-card grid place-items-center text-xs font-semibold hover:scale-105 transition-transform focus:outline-none focus:ring-2 focus:ring-ring/40"
              aria-label="User menu"
            >
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt="" className="size-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <span>{initials}</span>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex items-center gap-2">
                <UserIcon className="size-3.5" />
                <span className="truncate normal-case tracking-normal text-foreground font-medium text-sm">{displayName}</span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={signOut} className="text-destructive focus:text-destructive">
              <LogOut /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <AddTransactionDialog open={open} onOpenChange={setOpen} />
    </header>
  );
}
