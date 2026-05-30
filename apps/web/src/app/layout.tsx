import type { Metadata } from "next";
import { Inter, Spectral, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { QueryProvider } from "@/lib/query/provider";
import { TopNav } from "@/components/layout/TopNav";
import { MobileTabBar } from "@/components/layout/MobileTabBar";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const spectral = Spectral({
  variable: "--font-spectral",
  weight: ["500"],
  subsets: ["latin"],
});

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Palladium — Avalanche L1 Index",
  description:
    "Discover, compare, and evaluate every Avalanche L1 chain. Validators, TVL, transactions, and gas — indexed daily, served over an open API.",
};

const devModeInit = `try{if(localStorage.getItem('palladium-dev')==='1')document.documentElement.classList.add('dev')}catch(e){}`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${inter.variable} ${spectral.variable} ${jetbrains.variable} antialiased min-h-screen`}
      >
        <script dangerouslySetInnerHTML={{ __html: devModeInit }} />
        <QueryProvider>
          <TopNav />
          <main className="mx-auto max-w-7xl px-4 py-6 pb-24 md:pb-8">
            {children}
          </main>
          <footer className="border-t border-border py-6 text-center text-xs text-faint">
            <div className="mx-auto max-w-7xl px-4">
              Palladium — open-source Avalanche L1 explorer. Data from Glacier,
              P-Chain, DeFiLlama, and on-chain RPCs.
            </div>
          </footer>
          <MobileTabBar />
        </QueryProvider>
      </body>
    </html>
  );
}
