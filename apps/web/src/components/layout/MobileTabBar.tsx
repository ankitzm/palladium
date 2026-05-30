"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "Explore", icon: "◎", match: (p: string) => p === "/" },
  { href: "/chains", label: "Chains", icon: "▤", match: (p: string) => p.startsWith("/chains") },
  { href: "/validators", label: "Validators", icon: "◈", match: (p: string) => p.startsWith("/validators") },
  { href: "/api-docs", label: "API", icon: "{ }", match: (p: string) => p.startsWith("/api-docs") },
];

export function MobileTabBar() {
  const pathname = usePathname();
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 border-t border-border bg-background/95 backdrop-blur-md flex justify-around py-2">
      {TABS.map((t) => {
        const active = t.match(pathname);
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`flex flex-col items-center gap-0.5 text-[10px] ${
              active ? "text-avax-red" : "text-faint"
            }`}
          >
            <span className="text-base leading-none">{t.icon}</span>
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
