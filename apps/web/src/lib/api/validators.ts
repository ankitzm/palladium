import type { ValidatorsListResponse } from "@/types";
import { buildQuery, fetchJson } from "./client";

// Phase C: backed by GET /api/validators (not yet implemented server-side).
export function getValidators(params?: {
  sort?: string;
  order?: string;
  limit?: number;
  offset?: number;
}): Promise<ValidatorsListResponse> {
  return fetchJson<ValidatorsListResponse>(
    `/api/validators${buildQuery(params as Record<string, unknown>)}`,
  );
}
