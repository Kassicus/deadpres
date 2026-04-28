"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CircleDollarSign, Loader2, Lock, Mail, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

type Mode = "signin" | "signup";

export default function LoginPage() {
  const router = useRouter();
  const params = useSearchParams();
  const redirect = params.get("redirect") ?? "/";

  const [mode, setMode] = React.useState<Mode>("signin");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [name, setName] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [needsConfirm, setNeedsConfirm] = React.useState(false);

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    router.push(redirect);
    router.refresh();
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name.trim() || undefined },
        emailRedirectTo: `${window.location.origin}/auth/callback?redirect=${encodeURIComponent("/onboarding")}`,
      },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (data.session) {
      // Email confirmation disabled — user is signed in immediately.
      router.push("/onboarding");
      router.refresh();
    } else {
      // Email confirmation required.
      setNeedsConfirm(true);
    }
  }

  if (needsConfirm) {
    return (
      <Shell>
        <div className="text-center">
          <div className="size-12 rounded-2xl bg-primary/10 text-primary grid place-items-center mx-auto mb-4">
            <Mail className="size-6" />
          </div>
          <h2 className="text-xl font-semibold tracking-tight">Check your email</h2>
          <p className="text-sm text-muted-foreground mt-2">
            We sent a confirmation link to <span className="text-foreground font-medium">{email}</span>. Click it to finish creating your account.
          </p>
          <Button variant="ghost" className="mt-6" onClick={() => setNeedsConfirm(false)}>
            Back to sign in
          </Button>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <Tabs value={mode} onValueChange={(v) => setMode(v as Mode)}>
        <TabsList className="w-full grid grid-cols-2 mb-5">
          <TabsTrigger value="signin">Sign in</TabsTrigger>
          <TabsTrigger value="signup">Create account</TabsTrigger>
        </TabsList>

        <TabsContent value="signin">
          <form onSubmit={handleSignIn} className="space-y-4">
            <Field id="signin-email" label="Email" icon={Mail}>
              <Input
                id="signin-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="pl-9"
              />
            </Field>

            <Field id="signin-password" label="Password" icon={Lock} trailing={
              <Link href="/forgot-password" className="text-xs text-muted-foreground hover:text-foreground">
                Forgot?
              </Link>
            }>
              <Input
                id="signin-password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-9"
              />
            </Field>

            <Button type="submit" disabled={loading} size="lg" className="w-full">
              {loading ? <Loader2 className="size-4 animate-spin" /> : "Sign in"}
            </Button>
          </form>
        </TabsContent>

        <TabsContent value="signup">
          <form onSubmit={handleSignUp} className="space-y-4">
            <Field id="signup-name" label="Name" icon={User}>
              <Input
                id="signup-name"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="pl-9"
              />
            </Field>

            <Field id="signup-email" label="Email" icon={Mail}>
              <Input
                id="signup-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="pl-9"
              />
            </Field>

            <Field id="signup-password" label="Password" icon={Lock}>
              <Input
                id="signup-password"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                className="pl-9"
              />
            </Field>

            <Button type="submit" disabled={loading} size="lg" className="w-full">
              {loading ? <Loader2 className="size-4 animate-spin" /> : "Create account"}
            </Button>

            <p className="text-[11px] text-muted-foreground text-center leading-relaxed">
              By creating an account you agree to track your money like an adult.
            </p>
          </form>
        </TabsContent>
      </Tabs>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen grid place-items-center px-4 relative overflow-hidden">
      <div className="absolute inset-0 gradient-mesh opacity-60 pointer-events-none" />
      <div className="absolute inset-0 dot-pattern opacity-20 pointer-events-none" />
      <div className="relative w-full max-w-sm">
        <div className="flex flex-col items-center text-center mb-8">
          <div className="grid place-items-center size-14 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-xl shadow-violet-500/30 mb-4">
            <CircleDollarSign className="size-7" strokeWidth={2.5} />
          </div>
          <h1 className="text-3xl font-semibold tracking-tight">Dead Pres</h1>
          <p className="text-sm text-muted-foreground mt-1">Your money OS.</p>
        </div>

        <div className="rounded-2xl border border-border/70 bg-card/80 backdrop-blur p-6 shadow-xl">
          {children}
        </div>
      </div>
    </main>
  );
}

function Field({
  id,
  label,
  icon: Icon,
  trailing,
  children,
}: {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  trailing?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label htmlFor={id}>{label}</Label>
        {trailing}
      </div>
      <div className="relative">
        <Icon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
        {children}
      </div>
    </div>
  );
}
