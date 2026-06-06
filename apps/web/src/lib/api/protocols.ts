import type { ProtocolsListResponse } from "@/types";
import { buildQuery, fetchJson } from "./client";

// DeFi protocols on an Avalanche-family chain — GET /api/protocols.
export function getProtocols(params?: {
  chain?: string;
  chainKey?: string;
  limit?: number;
}): Promise<ProtocolsListResponse> {
  return fetchJson<ProtocolsListResponse>(
    `/api/protocols${buildQuery(params as Record<string, unknown>)}`,
  );
}
