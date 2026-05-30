import type { MetricsHistoryResponse } from "@/types";
import { buildQuery, fetchJson } from "./client";

export function getMetricsHistory(
  slug: string,
  days = 30,
): Promise<MetricsHistoryResponse> {
  return fetchJson<MetricsHistoryResponse>(
    `/api/chains/${slug}/metrics${buildQuery({ days } as Record<string, unknown>)}`,
  );
}
