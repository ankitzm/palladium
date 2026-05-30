"use client";

import { useBlockHeight } from "@/hooks/useBlockHeight";

// Live block-height pill (mockup: "● blk 48,201,773"). Polls a featured EVM
// chain via the backend proxy; falls back to a static "mainnet" label when the
// height is unavailable.
export function BlockTicker({ slug = "beam" }: { slug?: string }) {
  const { data: height } = useBlockHeight(slug);

  return (
    <span className="hidden md:flex items-center gap-1.5 font-mono text-[11px] text-faint">
      <span className="h-1.5 w-1.5 rounded-full bg-pos" />
      {height != null ? `blk ${height.toLocaleString()}` : "mainnet"}
    </span>
  );
}
