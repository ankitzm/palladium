"use client";

import { useQuery } from "@tanstack/react-query";
import { getChainBySlug } from "@/lib/api/chains";
import { getMetricsHistory } from "@/lib/api/metrics";
import { queryKeys } from "@/lib/query/keys";

export function useChainDetail(slug: string, days = 30) {
  const chain = useQuery({
    queryKey: queryKeys.chainDetail(slug),
    queryFn: () => getChainBySlug(slug),
  });

  const metrics = useQuery({
    queryKey: queryKeys.metrics(slug, days),
    queryFn: () => getMetricsHistory(slug, days),
    // History is best-effort; a failure shouldn't blank the page.
    retry: false,
  });

  return { chain, metrics };
}
