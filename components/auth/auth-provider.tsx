"use client";

import * as React from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { useFinance } from "@/lib/store";
import { postDueOccurrences } from "@/lib/auto-post";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = React.createContext<AuthContextValue>({
  user: null,
  loading: true,
  signOut: async () => {},
});

export function useAuth() {
  return React.useContext(AuthContext);
}

export function AuthProvider({
  initialUser,
  children,
}: {
  initialUser: User | null;
  children: React.ReactNode;
}) {
  const [user, setUser] = React.useState<User | null>(initialUser);
  const [loading, setLoading] = React.useState(initialUser === null);
  const loadAll = useFinance((s) => s.loadAll);
  const clear = useFinance((s) => s.clear);

  React.useEffect(() => {
    const supabase = createClient();

    async function bootstrap(uid: string) {
      // Run auto-poster *before* loadAll so freshly posted txs show up in the initial fetch.
      await postDueOccurrences(uid).catch((e) => console.error("auto-post error", e));
      await loadAll(uid);
      setLoading(false);
    }

    if (initialUser) {
      bootstrap(initialUser.id);
    } else {
      setLoading(false);
    }

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      const nextUser = session?.user ?? null;
      setUser(nextUser);
      if (event === "SIGNED_IN" && nextUser) {
        bootstrap(nextUser.id);
      }
      if (event === "SIGNED_OUT") {
        clear();
      }
    });

    return () => {
      sub.subscription.unsubscribe();
    };
  }, [initialUser, loadAll, clear]);

  const signOut = React.useCallback(async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    clear();
    window.location.href = "/login";
  }, [clear]);

  return (
    <AuthContext.Provider value={{ user, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
