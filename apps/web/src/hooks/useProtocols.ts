"use client";

import { useQuery } from "@tanstack/react-query";
import { getProtocols } from "@/lib/api/protocols";
import { queryKeys } from "@/lib/query/keys";

export function useProtocols(params?: {
  chain?: string;
  chainKey?: string;
  limit?: number;
}) {
  return useQuery({
    queryKey: queryKeys.protocols(params),
    queryFn: () => getProtocols(params),
    // Only fetch when scoped to a chain (the chain-detail use case).
    enabled: !!(params?.chain || params?.chainKey),
  });
}
