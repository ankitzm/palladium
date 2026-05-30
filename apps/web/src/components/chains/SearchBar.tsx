"use client";

import { useEffect, useRef } from "react";

export function SearchBar({
  value,
  onChange,
  placeholder = "Filter by name, chainId:, vm:, tvl:>100M, rpc:live…",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);

  // ⌘K / Ctrl+K / "/" focuses the search input.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const cmdK = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k";
      const slash =
        e.key === "/" &&
        !(e.target instanceof HTMLInputElement) &&
        !(e.target instanceof HTMLTextAreaElement);
      if (cmdK || slash) {
        e.preventDefault();
        ref.current?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div>
      <div className="flex items-center gap-2.5 rounded-md border border-border-strong bg-surface px-3.5 py-3">
        <span className="text-dim">⌕</span>
        <input
          ref={ref}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted focus:outline-none"
        />
        <span className="rounded border border-border-strong px-1.5 py-0.5 font-mono text-[11px] text-muted">
          ⌘K
        </span>
      </div>
      <p className="mt-1.5 px-1 font-mono text-[10px] text-faint">
        syntax: <span className="text-dim">chainId:4337</span>{" "}
        <span className="text-dim">vm:subnet-evm</span>{" "}
        <span className="text-dim">tvl:&gt;100M</span>{" "}
        <span className="text-dim">rpc:live</span> · plain text matches name/slug
      </p>
    </div>
  );
}
