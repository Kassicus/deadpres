import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";
import { Sidebar } from "@/components/shell/sidebar";
import { MobileNav } from "@/components/shell/mobile-nav";

export const metadata: Metadata = {
  title: "Pocket — Money OS",
  description: "A fun, modern personal finance command center.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className="dark">
      <head>
        <script
          // Pre-paint theme so there's no flash. Must run before React hydrates.
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('deadpres-theme');var d=t?t==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;document.documentElement.classList.toggle('dark',d);}catch(e){}})();`,
          }}
        />
      </head>
      <body className="font-sans antialiased min-h-screen overflow-x-hidden">
        <Providers>
          <div className="flex min-h-screen">
            <Sidebar />
            <div className="flex flex-col flex-1 min-w-0 relative">
              <div className="absolute inset-0 -z-10 gradient-mesh opacity-40 pointer-events-none" />
              <div className="flex-1 flex flex-col min-w-0">{children}</div>
              <MobileNav />
            </div>
          </div>
        </Providers>
      </body>
    </html>
  );
}
