import { eq, and, isNotNull } from "drizzle-orm";
import { chains, chainMetrics } from "@palladium/shared/db/schema";
import { todayDateString } from "@palladium/shared/utils";
import { fetchSupportedChains, fetchAllChainMetrics } from "../../clients/avacloud.js";
import type { Database } from "@palladium/shared/db";

const CONCURRENCY = 5;

export async function fetchAvaCloudMetrics(db: Database): Promise<number> {
  console.log("[fetch-avacloud] Fetching supported chains from AvaCloud...");
  const supportedChains = await fetchSupportedChains();
  const supportedEvmIds = new Set(supportedChains.map((c) => c.evmChainId));
  console.log(`[fetch-avacloud] ${supportedEvmIds.size} mainnet chains supported`);

  // Get active EVM chains from our DB that have evmChainId
  const activeChains = await db
    .select({ id: chains.id, evmChainId: chains.evmChainId })
    .from(chains)
    .where(
      and(
        eq(chains.isActive, true),
        eq(chains.isEvm, true),
        isNotNull(chains.evmChainId),
      ),
    );

  // Filter to only chains that AvaCloud supports
  const eligible = activeChains.filter(
    (c) => c.evmChainId !== null && supportedEvmIds.has(c.evmChainId),
  );
  console.log(`[fetch-avacloud] ${eligible.length} active chains have AvaCloud metrics`);

  const today = todayDateString();
  let success = 0;

  for (let i = 0; i < eligible.length; i += CONCURRENCY) {
    const batch = eligible.slice(i, i + CONCURRENCY);
    const results = await Promise.allSettled(
      batch.map(async (chain) => {
        const data = await fetchAllChainMetrics(chain.evmChainId!);

        await db
          .insert(chainMetrics)
          .values({
            chainId: chain.id,
            date: today,
            actualDailyTxs: data.txCount,
            activeAddresses: data.activeAddresses,
            cumulativeAddresses: data.cumulativeAddresses,
            tps: data.avgTps,
            peakTps: data.maxTps,
            avgGasConsumption: data.gasUsed,
            updatedAt: new Date(),
          })
          .onConflictDoUpdate({
            target: [chainMetrics.chainId, chainMetrics.date],
            set: {
              actualDailyTxs: data.txCount,
              activeAddresses: data.activeAddresses,
              cumulativeAddresses: data.cumulativeAddresses,
              tps: data.avgTps,
              peakTps: data.maxTps,
              avgGasConsumption: data.gasUsed,
              updatedAt: new Date(),
            },
          });

        return true;
      }),
    );

    success += results.filter((r) => r.status === "fulfilled" && r.value).length;

    const failed = results.filter((r) => r.status === "rejected");
    for (const f of failed) {
      if (f.status === "rejected") {
        console.warn(`[fetch-avacloud] Failed: ${f.reason}`);
      }
    }
  }

  console.log(`[fetch-avacloud] Successfully processed ${success}/${eligible.length} chains`);
  return success;
}
