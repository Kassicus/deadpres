"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, CircleDollarSign, Loader2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

export default function ForgotPasswordPage() {
  const [email, setEmail] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [sent, setSent] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setSent(true);
  }

  return (
    <main className="min-h-screen grid place-items-center px-4 relative overflow-hidden">
      <div className="absolute inset-0 gradient-mesh opacity-60 pointer-events-none" />
      <div className="absolute inset-0 dot-pattern opacity-20 pointer-events-none" />

      <div className="relative w-full max-w-sm">
        <div className="flex flex-col items-center text-center mb-8">
          <div className="grid place-items-center size-14 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-xl shadow-violet-500/30 mb-4">
            <CircleDollarSign className="size-7" strokeWidth={2.5} />
          </div>
          <h1 className="text-3xl font-semibold tracking-tight">Reset password</h1>
          <p className="text-sm text-muted-foreground mt-1">We&apos;ll email you a link to set a new one.</p>
        </div>

        <div className="rounded-2xl border border-border/70 bg-card/80 backdrop-blur p-6 shadow-xl">
          {sent ? (
            <div className="text-center">
              <div className="size-12 rounded-2xl bg-primary/10 text-primary grid place-items-center mx-auto mb-4">
                <Mail className="size-6" />
              </div>
              <p className="text-sm text-muted-foreground">
                If an account exists for <span className="text-foreground font-medium">{email}</span>, a reset link is on the way.
              </p>
              <Button asChild variant="ghost" className="mt-6 gap-2">
                <Link href="/login"><ArrowLeft /> Back to sign in</Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="fp-email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="fp-email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="pl-9"
                  />
                </div>
              </div>

              <Button type="submit" disabled={loading} size="lg" className="w-full">
                {loading ? <Loader2 className="size-4 animate-spin" /> : "Send reset link"}
              </Button>

              <Button asChild variant="ghost" className="w-full gap-2">
                <Link href="/login"><ArrowLeft /> Back to sign in</Link>
              </Button>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
