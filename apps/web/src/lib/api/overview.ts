import type { OverviewData } from "@/types";
import { fetchJson } from "./client";

export function getOverview(): Promise<OverviewData> {
  return fetchJson<OverviewData>("/api/overview");
}
