import type {
  ValidatorsListResponse,
  PrimaryValidatorsListResponse,
} from "@/types";
import { buildQuery, fetchJson } from "./client";

// Per-L1 (subnet) validators — GET /api/validators.
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

// Primary-Network (AVAX) validators — GET /api/validators/primary.
export function getPrimaryValidators(params?: {
  sort?: string;
  order?: string;
  limit?: number;
  offset?: number;
}): Promise<PrimaryValidatorsListResponse> {
  return fetchJson<PrimaryValidatorsListResponse>(
    `/api/validators/primary${buildQuery(params as Record<string, unknown>)}`,
  );
}
