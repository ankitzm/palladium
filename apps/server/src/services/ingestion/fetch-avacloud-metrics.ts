import { eq, isNotNull, and } from "drizzle-orm";
import { chains, chainMetrics } from "@palladium/shared/db/schema";
import { todayDateString } from "@palladium/shared/utils";
import { fetchChainMetric } from "../../clients/avacloud.js";
import type { Database } from "@palladium/shared/db";

const CONCURRENCY_LIMIT = 3;

async function processChain(
    db: Database,
    chain: { id: number; evmChainId: number | null },
    today: string,
): Promise<boolean> {
    if (!chain.evmChainId) return false;

    try {
        const [txCountRes, activeAddrsRes] = await Promise.all([
            fetchChainMetric(chain.evmChainId, "txCount"),
            fetchChainMetric(chain.evmChainId, "activeAddresses"),
        ]);

        // get the reading with highest matching timestamp, or closest to today
        // results are usually returned in descending order. We just take the first one 
        // or we could sort by timestamp descending to be safe.

        // sorting by timestamp desc so latest is index 0
        const txCountSorted = txCountRes.results.sort((a, b) => b.timestamp - a.timestamp);
        const activeAddrsSorted = activeAddrsRes.results.sort((a, b) => b.timestamp - a.timestamp);

        const actualDailyTxs = txCountSorted.length > 0 ? txCountSorted[0].value : null;
        const activeAddresses = activeAddrsSorted.length > 0 ? activeAddrsSorted[0].value : null;

        // calculate TPS based on daily txs
        const tps = actualDailyTxs !== null ? actualDailyTxs / 86400 : null;

        if (actualDailyTxs === null && activeAddresses === null) {
            return false; // nothing to update
        }

        await db
            .insert(chainMetrics)
            .values({
                chainId: chain.id,
                date: today,
                actualDailyTxs,
                activeAddresses,
                tps,
                updatedAt: new Date(),
            })
            .onConflictDoUpdate({
                target: [chainMetrics.chainId, chainMetrics.date],
                set: {
                    ...(actualDailyTxs !== null && { actualDailyTxs }),
                    ...(activeAddresses !== null && { activeAddresses }),
                    ...(tps !== null && { tps }),
                    updatedAt: new Date(),
                },
            });

        return true;
    } catch (err) {
        console.warn(
            `[fetch-avacloud-metrics] Failed for chain ${chain.id} (evm: ${chain.evmChainId}): ${err instanceof Error ? err.message : err}`,
        );
        return false;
    }
}

export async function fetchAvacloudMetrics(db: Database): Promise<number> {
    console.log("[fetch-avacloud-metrics] Getting chains for AvaCloud metrics...");

    const activeChains = await db
        .select({ id: chains.id, evmChainId: chains.evmChainId })
        .from(chains)
        .where(
            and(
                eq(chains.enabled, true),
                isNotNull(chains.evmChainId)
            ),
        );

    console.log(`[fetch-avacloud-metrics] Processing ${activeChains.length} chains...`);
    const today = todayDateString();
    let success = 0;

    for (let i = 0; i < activeChains.length; i += CONCURRENCY_LIMIT) {
        const batch = activeChains.slice(i, i + CONCURRENCY_LIMIT);
        const results = await Promise.allSettled(
            batch.map((c) => processChain(db, c, today)),
        );
        success += results.filter(
            (r) => r.status === "fulfilled" && r.value,
        ).length;
    }

    console.log(`[fetch-avacloud-metrics] Successfully processed ${success}/${activeChains.length} chains`);
    return success;
}
