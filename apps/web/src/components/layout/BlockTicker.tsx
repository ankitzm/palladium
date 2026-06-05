"use client";

import { useBlockHeight } from "@/hooks/useBlockHeight";

// Live block-height pill (mockup: "● blk 48,201,773"). Polls a featured EVM
// chain via the backend proxy. When the height is unavailable, stays honest:
// a muted dot and "blk —" rather than a green dot implying a live feed.
export function BlockTicker({ slug = "beam" }: { slug?: string }) {
  const { data: height } = useBlockHeight(slug);
  const live = height != null;

  return (
    <span className="hidden md:flex items-center gap-1.5 font-mono text-[11px] text-faint">
      <span
        aria-hidden="true"
        className={`h-1.5 w-1.5 rounded-full ${live ? "bg-pos" : "bg-faint"}`}
      />
      {live ? `blk ${height.toLocaleString()}` : "blk —"}
    </span>
  );
}
