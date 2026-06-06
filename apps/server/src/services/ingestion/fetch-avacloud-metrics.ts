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
    .select({ id: chains.id, evmChainId: chains.evmChainId, name: chains.name })
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

        // Log what we got for this chain
        const stats: string[] = [];
        if (data.txCount !== null) stats.push(`txs=${data.txCount}`);
        if (data.activeAddresses !== null) stats.push(`addrs=${data.activeAddresses}`);
        if (data.feesPaid !== null) stats.push(`fees=${data.feesPaid.toFixed(2)}`);
        if (data.avgTps !== null) stats.push(`tps=${data.avgTps.toFixed(2)}`);
        console.log(
          `[fetch-avacloud] ✓ ${chain.name} (${chain.evmChainId}): ${stats.join(", ") || "no data"}`,
        );

        // Shared column set for insert + update (Bucket A extended metrics).
        const cols = {
          actualDailyTxs: data.txCount,
          activeAddresses: data.activeAddresses,
          activeSenders: data.activeSenders,
          cumulativeAddresses: data.cumulativeAddresses,
          cumulativeTxCount: data.cumulativeTxCount,
          cumulativeContracts: data.cumulativeContracts,
          cumulativeDeployers: data.cumulativeDeployers,
          contractsDeployed: data.contracts,
          deployers: data.deployers,
          tps: data.avgTps,
          peakTps: data.maxTps,
          avgGps: data.avgGps,
          maxGps: data.maxGps,
          avgGasConsumption: data.gasUsed,
          maxGasPrice: data.maxGasPrice,
          feesPaid: data.feesPaid,
          updatedAt: new Date(),
        };

        await db
          .insert(chainMetrics)
          .values({ chainId: chain.id, date: today, ...cols })
          .onConflictDoUpdate({
            target: [chainMetrics.chainId, chainMetrics.date],
            set: cols,
          });

        return true;
      }),
    );

    success += results.filter((r) => r.status === "fulfilled" && r.value).length;

    const failed = results.filter((r) => r.status === "rejected");
    for (const f of failed) {
      if (f.status === "rejected") {
        console.warn(`[fetch-avacloud] ✗ Failed: ${f.reason}`);
      }
    }
  }

  console.log(`[fetch-avacloud] Successfully processed ${success}/${eligible.length} chains`);
  return success;
}
