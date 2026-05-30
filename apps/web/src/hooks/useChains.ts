"use client";

import { useQuery } from "@tanstack/react-query";
import { getChains } from "@/lib/api/chains";
import { queryKeys } from "@/lib/query/keys";
import type { ChainsQueryParams } from "@/types";

export function useChains(params?: ChainsQueryParams) {
  return useQuery({
    queryKey: queryKeys.chains(params),
    queryFn: () => getChains(params),
  });
}
