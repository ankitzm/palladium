import type {
  Chain,
  ChainsListResponse,
  ChainsQueryParams,
} from "@/types";
import { buildQuery, fetchJson } from "./client";

export function getChains(
  params?: ChainsQueryParams,
): Promise<ChainsListResponse> {
  return fetchJson<ChainsListResponse>(
    `/api/chains${buildQuery(params as Record<string, unknown>)}`,
  );
}

export function getChainBySlug(slug: string): Promise<{ chain: Chain }> {
  return fetchJson<{ chain: Chain }>(`/api/chains/${slug}`);
}
