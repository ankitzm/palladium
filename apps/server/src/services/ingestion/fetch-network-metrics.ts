import { networkMetrics } from "@palladium/shared/db/schema";
import { todayDateString } from "@palladium/shared/utils";
import { fetchNetworkMetrics } from "../../clients/avacloud.js";
import type { Database } from "@palladium/shared/db";

// Avalanche-network-wide daily staking rollups (one row per day, not per chain).
export async function fetchNetworkMetrics_ingest(db: Database): Promise<number> {
  console.log("[network-metrics] Fetching network-wide staking rollups...");
  const m = await fetchNetworkMetrics();
  console.log(
    `[network-metrics] validators=${m.validatorCount} delegators=${m.delegatorCount}`,
  );

  const today = todayDateString();
  const row = {
    validatorCount: m.validatorCount,
    validatorWeight: m.validatorWeight,
    delegatorCount: m.delegatorCount,
    delegatorWeight: m.delegatorWeight,
    updatedAt: new Date(),
  };

  await db
    .insert(networkMetrics)
    .values({ date: today, ...row })
    .onConflictDoUpdate({ target: networkMetrics.date, set: row });

  return 1;
}
