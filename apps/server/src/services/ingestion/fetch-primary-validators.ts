import { primaryValidators } from "@palladium/shared/db/schema";
import { fetchPrimaryValidators } from "../../clients/glacier.js";
import type { GlacierPrimaryValidator } from "@palladium/shared/types";
import type { Database } from "@palladium/shared/db";

const BATCH = 50;

function num(v: unknown): number | null {
  if (v == null) return null;
  const n = typeof v === "number" ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : null;
}

function reachability(h: GlacierPrimaryValidator["validatorHealth"]): number | null {
  if (h == null) return null;
  if (typeof h === "number") return h;
  return num(h.reachabilityPercent);
}

function rewardAmount(
  r: GlacierPrimaryValidator["potentialRewards"],
): number | null {
  if (r == null) return null;
  if (typeof r === "string") return num(r);
  return num(r.validationRewardAmount);
}

// Avalanche Primary-Network (AVAX) validators — rich uptime/delegation/geo.
// Network-wide set, stored in its own table (not per-L1).
export async function fetchPrimaryValidators_ingest(
  db: Database,
): Promise<number> {
  console.log("[primary-validators] Fetching active Primary-Network validators...");
  const validators = await fetchPrimaryValidators({ status: "active" });
  console.log(`[primary-validators] Got ${validators.length} validators`);

  let processed = 0;
  for (let i = 0; i < validators.length; i += BATCH) {
    const batch = validators.slice(i, i + BATCH);
    await Promise.all(
      batch.map((v) => {
        const row = {
          nodeId: v.nodeId,
          txHash: v.txHash ?? null,
          amountStaked: num(v.amountStaked),
          amountDelegated: num(v.amountDelegated),
          delegationFee: num(v.delegationFee),
          delegatorCount: v.delegatorCount ?? null,
          uptimePercent: num(v.uptimePerformance),
          validatorHealth: reachability(v.validatorHealth),
          stakePercentage: num(v.stakePercentage),
          potentialRewards: rewardAmount(v.potentialRewards),
          startTimestamp: v.startTimestamp ?? null,
          endTimestamp: v.endTimestamp ?? null,
          validationStatus: v.validationStatus ?? null,
          country: v.geolocation?.country ?? null,
          countryCode: v.geolocation?.countryCode ?? null,
          avalanchegoVersion: v.avalancheGoVersion ?? null,
          updatedAt: new Date(),
        };
        return db
          .insert(primaryValidators)
          .values(row)
          .onConflictDoUpdate({
            target: primaryValidators.nodeId,
            set: {
              txHash: row.txHash,
              amountStaked: row.amountStaked,
              amountDelegated: row.amountDelegated,
              delegationFee: row.delegationFee,
              delegatorCount: row.delegatorCount,
              uptimePercent: row.uptimePercent,
              validatorHealth: row.validatorHealth,
              stakePercentage: row.stakePercentage,
              potentialRewards: row.potentialRewards,
              startTimestamp: row.startTimestamp,
              endTimestamp: row.endTimestamp,
              validationStatus: row.validationStatus,
              country: row.country,
              countryCode: row.countryCode,
              avalanchegoVersion: row.avalanchegoVersion,
              updatedAt: row.updatedAt,
            },
          });
      }),
    );
    processed += batch.length;
  }

  console.log(`[primary-validators] Upserted ${processed} validators`);
  return processed;
}
