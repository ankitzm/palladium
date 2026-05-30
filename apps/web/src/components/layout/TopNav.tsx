"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { DevModeToggle } from "./DevModeToggle";
import { BlockTicker } from "./BlockTicker";
import { Logo } from "@/components/ui/Logo";

const LINKS = [
  { href: "/", label: "Explore", match: (p: string) => p === "/" },
  { href: "/chains", label: "Chains", match: (p: string) => p.startsWith("/chains") },
  { href: "/validators", label: "Validators", match: (p: string) => p.startsWith("/validators") },
  { href: "/api-docs", label: "API", match: (p: string) => p.startsWith("/api-docs") },
];

export function TopNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-[58px] max-w-7xl items-center justify-between px-4">
        <div className="flex items-center gap-5">
          <Link href="/" className="flex items-center gap-2.5">
            <Logo />
            <span className="text-[15px] font-medium tracking-tight">Palladium</span>
          </Link>
          <div className="hidden md:flex items-center gap-1 text-[13px]">
            {LINKS.map((l) => {
              const active = l.match(pathname);
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={`rounded-md px-3 py-1.5 transition-colors ${
                    active
                      ? "bg-elevated text-foreground"
                      : "text-muted hover:text-foreground"
                  }`}
                >
                  {l.label}
                </Link>
              );
            })}
          </div>
        </div>
        <div className="flex items-center gap-4">
          <DevModeToggle />
          <BlockTicker />
          <button
            type="button"
            aria-label="Menu"
            onClick={() => setOpen((o) => !o)}
            className="md:hidden text-foreground text-xl leading-none"
          >
            ≡
          </button>
        </div>
      </div>
      {open && (
        <div className="md:hidden border-t border-border px-4 py-2 flex flex-col">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="py-2 text-sm text-muted hover:text-foreground"
            >
              {l.label}
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
}
