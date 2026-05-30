"use client";

import { useQuery } from "@tanstack/react-query";
import { getBlockHeight } from "@/lib/api/block";
import { queryKeys } from "@/lib/query/keys";

// Polls the backend block-height proxy for a chain. Degrades to null (caller
// shows a static pill) on any error. Only runs when a slug is provided.
export function useBlockHeight(slug: string | null) {
  return useQuery({
    queryKey: queryKeys.blockHeight(slug ?? ""),
    queryFn: ({ signal }) =>
      slug ? getBlockHeight(slug, signal) : Promise.resolve(null),
    enabled: !!slug,
    refetchInterval: 10_000,
    staleTime: 0,
    retry: false,
  });
}
