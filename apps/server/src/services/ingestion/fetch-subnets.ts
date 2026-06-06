import { subnets } from "@palladium/shared/db/schema";
import { fetchSubnets } from "../../clients/glacier.js";
import type { Database } from "@palladium/shared/db";

const BATCH = 50;

// Subnet ownership + L1-conversion status from Glacier /subnets.
export async function fetchSubnets_ingest(db: Database): Promise<number> {
  console.log("[subnets] Fetching subnets from Glacier...");
  const all = await fetchSubnets();
  const l1Count = all.filter((s) => s.isL1).length;
  console.log(`[subnets] Got ${all.length} subnets (${l1Count} are L1s)`);

  let processed = 0;
  for (let i = 0; i < all.length; i += BATCH) {
    const batch = all.slice(i, i + BATCH);
    await Promise.all(
      batch.map((s) => {
        const row = {
          ownerAddresses: s.ownerAddresses ?? null,
          threshold: s.threshold ?? null,
          locktime: s.locktime ?? null,
          isL1: s.isL1 ?? false,
          blockchainCount: s.blockchains?.length ?? null,
          createBlockTimestamp: s.createBlockTimestamp ?? null,
          updatedAt: new Date(),
        };
        return db
          .insert(subnets)
          .values({ subnetId: s.subnetId, ...row })
          .onConflictDoUpdate({ target: subnets.subnetId, set: row });
      }),
    );
    processed += batch.length;
  }

  console.log(`[subnets] Upserted ${processed} subnets`);
  return processed;
}
