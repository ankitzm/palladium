import { eq, and, notInArray } from "drizzle-orm";
import { chains, chainValidators, chainMetrics } from "@palladium/shared/db/schema";
import { PRIMARY_NETWORK_SUBNET_ID, todayDateString } from "@palladium/shared/utils";
import { fetchCurrentValidators } from "../../clients/pchain.js";
import type { Database } from "@palladium/shared/db";
import type { PChainValidator } from "@palladium/shared/types";

const CONCURRENCY = 10;

async function processSubnet(
  db: Database,
  subnetId: string,
  chainIds: number[],
  today: string,
): Promise<number> {
  const validators = await fetchCurrentValidators(subnetId);

  for (const chainId of chainIds) {
    // Just update the metrics count — skip individual validator upserts for speed
    // (we can add per-validator tracking in a future pass)
    const totalWeight = validators.reduce(
      (sum, v) => sum + (v.weight ? parseInt(v.weight) : 0),
      0,
    );

    await db
      .insert(chainMetrics)
      .values({
        chainId,
        date: today,
        validatorCount: validators.length,
        totalStakeWeight: totalWeight || null,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [chainMetrics.chainId, chainMetrics.date],
        set: {
          validatorCount: validators.length,
          totalStakeWeight: totalWeight || null,
          updatedAt: new Date(),
        },
      });
  }

  return chainIds.length;
}

export async function fetchValidators(db: Database): Promise<number> {
  console.log("[fetch-validators] Getting unique subnet IDs...");

  const chainRows = await db
    .select({ id: chains.id, subnetId: chains.subnetId })
    .from(chains)
    .where(eq(chains.enabled, true));

  // Group chains by subnet
  const subnetToChains = new Map<string, number[]>();
  for (const row of chainRows) {
    if (row.subnetId === PRIMARY_NETWORK_SUBNET_ID) continue;
    const existing = subnetToChains.get(row.subnetId) ?? [];
    existing.push(row.id);
    subnetToChains.set(row.subnetId, existing);
  }

  const entries = [...subnetToChains.entries()];
  console.log(`[fetch-validators] Processing ${entries.length} subnets (concurrency=${CONCURRENCY})...`);

  let totalProcessed = 0;
  const today = todayDateString();

  // Process in batches with concurrency
  for (let i = 0; i < entries.length; i += CONCURRENCY) {
    const batch = entries.slice(i, i + CONCURRENCY);
    const results = await Promise.allSettled(
      batch.map(([subnetId, chainIds]) =>
        processSubnet(db, subnetId, chainIds, today),
      ),
    );

    for (const r of results) {
      if (r.status === "fulfilled") totalProcessed += r.value;
    }

    // Log progress every batch
    if ((i + CONCURRENCY) % 50 === 0 || i + CONCURRENCY >= entries.length) {
      console.log(`[fetch-validators] Progress: ${Math.min(i + CONCURRENCY, entries.length)}/${entries.length} subnets`);
    }
  }

  console.log(`[fetch-validators] Processed ${totalProcessed} chains`);
  return totalProcessed;
}
