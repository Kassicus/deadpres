import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";
import { AuthProvider } from "@/components/auth/auth-provider";
import { AppShell } from "@/components/shell/app-shell";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Dead Pres",
  description: "A fun, modern personal finance command center.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <html lang="en" suppressHydrationWarning className="dark">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('deadpres-theme');var d=t?t==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;document.documentElement.classList.toggle('dark',d);}catch(e){}})();`,
          }}
        />
      </head>
      <body className="font-sans antialiased min-h-screen overflow-x-hidden">
        <Providers>
          <AuthProvider initialUser={user}>
            <AppShell hasUser={!!user}>{children}</AppShell>
          </AuthProvider>
        </Providers>
      </body>
    </html>
  );
}
