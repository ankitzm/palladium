import type { ChainsQueryParams } from "@/types";

// Single source of truth for cache keys. Hooks and server-side prefetch must use
// the same key for a given resource or hydration won't match.
export const queryKeys = {
  overview: () => ["overview"] as const,
  chains: (params?: ChainsQueryParams) =>
    ["chains", params ?? {}] as const,
  chainDetail: (slug: string) => ["chain", slug] as const,
  metrics: (slug: string, days: number) =>
    ["metrics", slug, days] as const,
  validators: (params?: object) =>
    ["validators", params ?? {}] as const,
  blockHeight: (slug: string) => ["block-height", slug] as const,
};
