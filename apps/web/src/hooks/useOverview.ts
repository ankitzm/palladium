"use client";

import { useQuery } from "@tanstack/react-query";
import { getOverview } from "@/lib/api/overview";
import { queryKeys } from "@/lib/query/keys";

export function useOverview() {
  return useQuery({
    queryKey: queryKeys.overview(),
    queryFn: getOverview,
  });
}
