import { eq } from "drizzle-orm";
import { chains, chainValidators, chainMetrics } from "@palladium/shared/db/schema";
import { PRIMARY_NETWORK_SUBNET_ID, todayDateString } from "@palladium/shared/utils";
import { fetchCurrentValidators } from "../../clients/pchain.js";
import type { Database } from "@palladium/shared/db";

const CONCURRENCY = 10;

async function processSubnet(
  db: Database,
  subnetId: string,
  chainIds: number[],
  today: string,
): Promise<number> {
  const validators = await fetchCurrentValidators(subnetId);

  const totalWeight = validators.reduce(
    (sum, v) => sum + (v.weight ? parseInt(v.weight) : 0),
    0,
  );

  for (const chainId of chainIds) {
    // Update aggregate metrics
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

    // Upsert individual validator records with full P-Chain data
    for (const v of validators) {
      await db
        .insert(chainValidators)
        .values({
          chainId,
          nodeId: v.nodeID,
          weight: v.weight ? parseInt(v.weight) : null,
          isConnected: v.connected ?? null,
          uptimePercent: v.uptime ? parseFloat(v.uptime) : null,
          startTime: v.startTime ? parseInt(v.startTime) : null,
          endTime: v.endTime ? parseInt(v.endTime) : null,
          delegationFee: v.delegationFee ? parseFloat(v.delegationFee) : null,
          delegatorCount: v.delegatorCount ? parseInt(v.delegatorCount) : null,
          delegatorWeight: v.delegatorWeight ? parseInt(v.delegatorWeight) : null,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [chainValidators.chainId, chainValidators.nodeId],
          set: {
            weight: v.weight ? parseInt(v.weight) : null,
            isConnected: v.connected ?? null,
            uptimePercent: v.uptime ? parseFloat(v.uptime) : null,
            startTime: v.startTime ? parseInt(v.startTime) : null,
            endTime: v.endTime ? parseInt(v.endTime) : null,
            delegationFee: v.delegationFee ? parseFloat(v.delegationFee) : null,
            delegatorCount: v.delegatorCount ? parseInt(v.delegatorCount) : null,
            delegatorWeight: v.delegatorWeight ? parseInt(v.delegatorWeight) : null,
            updatedAt: new Date(),
          },
        });
    }
  }

  return chainIds.length;
}

export async function fetchValidators(db: Database): Promise<number> {
  console.log("[fetch-validators] Getting unique subnet IDs...");

  const chainRows = await db
    .select({ id: chains.id, subnetId: chains.subnetId })
    .from(chains)
    .where(eq(chains.isActive, true));

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

    if ((i + CONCURRENCY) % 50 === 0 || i + CONCURRENCY >= entries.length) {
      console.log(`[fetch-validators] Progress: ${Math.min(i + CONCURRENCY, entries.length)}/${entries.length} subnets`);
    }
  }

  console.log(`[fetch-validators] Processed ${totalProcessed} chains`);
  return totalProcessed;
}
