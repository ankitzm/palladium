import { eq, sql, and, notInArray } from "drizzle-orm";
import { chains, chainValidators, chainMetrics } from "@palladium/shared/db/schema";
import { PRIMARY_NETWORK_SUBNET_ID, todayDateString } from "@palladium/shared/utils";
import { fetchCurrentValidators } from "../../clients/pchain.js";
import type { Database } from "@palladium/shared/db";

export async function fetchValidators(db: Database): Promise<number> {
  console.log("[fetch-validators] Getting unique subnet IDs...");

  // Get all unique subnet IDs from enabled chains (excluding primary network)
  const chainRows = await db
    .select({
      id: chains.id,
      subnetId: chains.subnetId,
    })
    .from(chains)
    .where(and(eq(chains.enabled, true)));

  // Group chains by subnet
  const subnetToChains = new Map<string, number[]>();
  for (const row of chainRows) {
    if (row.subnetId === PRIMARY_NETWORK_SUBNET_ID) continue;
    const existing = subnetToChains.get(row.subnetId) ?? [];
    existing.push(row.id);
    subnetToChains.set(row.subnetId, existing);
  }

  console.log(`[fetch-validators] Processing ${subnetToChains.size} subnets...`);
  let totalProcessed = 0;
  const today = todayDateString();

  for (const [subnetId, chainIds] of subnetToChains) {
    try {
      const validators = await fetchCurrentValidators(subnetId);

      // Upsert validators for each chain in this subnet
      for (const chainId of chainIds) {
        const currentNodeIds: string[] = [];

        for (const v of validators) {
          currentNodeIds.push(v.nodeID);

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
              updatedAt: new Date(),
            })
            .onConflictDoUpdate({
              target: [chainValidators.chainId, chainValidators.nodeId],
              set: {
                weight: v.weight ? parseInt(v.weight) : null,
                isConnected: v.connected ?? null,
                uptimePercent: v.uptime ? parseFloat(v.uptime) : null,
                updatedAt: new Date(),
              },
            });
        }

        // Remove stale validators
        if (currentNodeIds.length > 0) {
          await db
            .delete(chainValidators)
            .where(
              and(
                eq(chainValidators.chainId, chainId),
                notInArray(chainValidators.nodeId, currentNodeIds),
              ),
            );
        } else {
          // No validators — remove all
          await db
            .delete(chainValidators)
            .where(eq(chainValidators.chainId, chainId));
        }

        // Update metrics for today
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

      totalProcessed += chainIds.length;
    } catch (err) {
      console.warn(
        `[fetch-validators] Failed for subnet ${subnetId.slice(0, 12)}...: ${err instanceof Error ? err.message : err}`,
      );
    }
  }

  console.log(`[fetch-validators] Processed ${totalProcessed} chains`);
  return totalProcessed;
}
