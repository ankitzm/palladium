import { eq, lt } from "drizzle-orm";
import { chains, chainValidators, chainMetrics } from "@palladium/shared/db/schema";
import { PRIMARY_NETWORK_SUBNET_ID, todayDateString } from "@palladium/shared/utils";
import { fetchL1Validators } from "../../clients/glacier.js";
import type { GlacierL1Validator } from "@palladium/shared/types";
import type { Database } from "@palladium/shared/db";

const RECORD_BATCH = 50;

// Per-L1 (subnet) validators from Glacier /l1Validators. These carry weight and
// remaining continuous-fee balance, but NOT uptime/connection/delegators — those
// fields exist only for Primary-Network validators (handled separately).
export async function fetchL1Validators_ingest(db: Database): Promise<number> {
  console.log("[l1-validators] Fetching all L1 validators from Glacier...");
  const validators = await fetchL1Validators();
  console.log(`[l1-validators] Got ${validators.length} L1 validators`);

  // Map subnetId -> chainIds (a subnet can back multiple blockchains).
  const chainRows = await db
    .select({ id: chains.id, subnetId: chains.subnetId })
    .from(chains)
    .where(eq(chains.isActive, true));

  const subnetToChains = new Map<string, number[]>();
  for (const row of chainRows) {
    if (row.subnetId === PRIMARY_NETWORK_SUBNET_ID) continue;
    const arr = subnetToChains.get(row.subnetId) ?? [];
    arr.push(row.id);
    subnetToChains.set(row.subnetId, arr);
  }

  // Group validators by subnet.
  const bySubnet = new Map<string, GlacierL1Validator[]>();
  for (const v of validators) {
    const arr = bySubnet.get(v.subnetId) ?? [];
    arr.push(v);
    bySubnet.set(v.subnetId, arr);
  }

  const today = todayDateString();
  // Anything not re-written by this run is a departed/stale validator (e.g. left
  // over from the old P-Chain pipeline, or a validator that exited the set). We
  // delete those after the upserts so the L1 list reflects the CURRENT set only.
  const runStart = new Date();
  let processedChains = 0;

  for (const [subnetId, vals] of bySubnet) {
    const chainIds = subnetToChains.get(subnetId);
    if (!chainIds || chainIds.length === 0) continue;

    const totalWeight = vals.reduce((s, v) => s + (v.weight || 0), 0);

    for (const chainId of chainIds) {
      // Aggregate counts onto today's metrics row.
      await db
        .insert(chainMetrics)
        .values({
          chainId,
          date: today,
          validatorCount: vals.length,
          totalStakeWeight: totalWeight || null,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [chainMetrics.chainId, chainMetrics.date],
          set: {
            validatorCount: vals.length,
            totalStakeWeight: totalWeight || null,
            updatedAt: new Date(),
          },
        });

      // Upsert individual validator records (weight + balance only).
      for (let i = 0; i < vals.length; i += RECORD_BATCH) {
        const batch = vals.slice(i, i + RECORD_BATCH);
        await Promise.all(
          batch.map((v) =>
            db
              .insert(chainValidators)
              .values({
                chainId,
                nodeId: v.nodeId,
                validationId: v.validationId ?? null,
                weight: v.weight ?? null,
                remainingBalance: v.remainingBalance ?? null,
                startTime: v.creationTimestamp ?? null,
                updatedAt: new Date(),
              })
              .onConflictDoUpdate({
                target: [chainValidators.chainId, chainValidators.nodeId],
                set: {
                  validationId: v.validationId ?? null,
                  weight: v.weight ?? null,
                  remainingBalance: v.remainingBalance ?? null,
                  startTime: v.creationTimestamp ?? null,
                  updatedAt: new Date(),
                },
              }),
          ),
        );
      }
      processedChains++;
    }
  }

  // Prune validators not seen in this run (departed or pre-Etna leftovers).
  const pruned = await db
    .delete(chainValidators)
    .where(lt(chainValidators.updatedAt, runStart))
    .returning({ id: chainValidators.id });
  console.log(
    `[l1-validators] Processed ${processedChains} chains across ${bySubnet.size} subnets; pruned ${pruned.length} stale validators`,
  );
  return processedChains;
}
