import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Palladium — Avalanche L1 Explorer",
  description:
    "Discover, compare, and evaluate every Avalanche L1 chain. Real-time metrics, validators, TVL, and activity data.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen`}
      >
        <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
          <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-avax-red font-bold text-white text-sm">
                P
              </div>
              <span className="font-semibold text-foreground tracking-tight">
                PALLADIUM
              </span>
            </Link>
            <nav className="flex items-center gap-6 text-sm">
              <Link
                href="/"
                className="text-muted hover:text-foreground transition-colors"
              >
                Overview
              </Link>
              <Link
                href="/chains"
                className="text-muted hover:text-foreground transition-colors"
              >
                Chains
              </Link>
              <Link
                href="/api-docs"
                className="text-muted hover:text-foreground transition-colors"
              >
                API
              </Link>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-4 py-8">{children}</main>
        <footer className="border-t border-border py-6 text-center text-xs text-muted">
          <div className="mx-auto max-w-7xl px-4">
            Palladium — Open-source Avalanche L1 Explorer. Data sourced from
            Glacier, P-Chain, DeFiLlama, and on-chain RPCs.
          </div>
        </footer>
      </body>
    </html>
  );
}
