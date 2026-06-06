"use client";

import { useQuery } from "@tanstack/react-query";
import { getValidators, getPrimaryValidators } from "@/lib/api/validators";
import { queryKeys } from "@/lib/query/keys";

export interface ValidatorParams {
  sort?: string;
  order?: string;
  limit?: number;
  offset?: number;
}

export function useValidators(params?: ValidatorParams) {
  return useQuery({
    queryKey: queryKeys.validators(params),
    queryFn: () => getValidators(params),
  });
}

export function usePrimaryValidators(params?: ValidatorParams) {
  return useQuery({
    queryKey: queryKeys.primaryValidators(params),
    queryFn: () => getPrimaryValidators(params),
  });
}
