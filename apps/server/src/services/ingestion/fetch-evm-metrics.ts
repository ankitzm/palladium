import { eq, and, isNotNull } from "drizzle-orm";
import { chains, chainMetrics } from "@palladium/shared/db/schema";
import { todayDateString } from "@palladium/shared/utils";
import { fetchBlockNumber, fetchBlockByNumber } from "../../clients/evm-rpc.js";
import type { Database } from "@palladium/shared/db";

const CONCURRENCY_LIMIT = 5;
const SAMPLE_BLOCKS = 10;

async function processChain(
  db: Database,
  chain: { id: number; rpcUrl: string },
  today: string,
): Promise<boolean> {
  try {
    const latestNum = await fetchBlockNumber(chain.rpcUrl);
    const olderNum = Math.max(0, latestNum - SAMPLE_BLOCKS);

    const [latestBlock, olderBlock] = await Promise.all([
      fetchBlockByNumber(chain.rpcUrl, latestNum),
      fetchBlockByNumber(chain.rpcUrl, olderNum),
    ]);

    const latestTs = parseInt(latestBlock.timestamp, 16);
    const olderTs = parseInt(olderBlock.timestamp, 16);
    const blockDiff = latestNum - olderNum;

    const avgBlockTime =
      blockDiff > 0 ? (latestTs - olderTs) / blockDiff : 0;

    // Count txs in latest block as a sample
    const recentTxCount = latestBlock.transactions.length;

    // Estimate daily txs: (txs per block) * (blocks per day)
    const txsPerBlock = recentTxCount; // single block sample
    const blocksPerDay = avgBlockTime > 0 ? 86400 / avgBlockTime : 0;
    const estimatedDailyTxs = Math.round(txsPerBlock * blocksPerDay);

    // Gas price in gwei
    const avgGasPrice = latestBlock.baseFeePerGas
      ? parseInt(latestBlock.baseFeePerGas, 16) / 1e9
      : null;

    await db
      .insert(chainMetrics)
      .values({
        chainId: chain.id,
        date: today,
        latestBlockNumber: latestNum,
        recentTxCount,
        avgGasPrice,
        avgBlockTime: avgBlockTime > 0 ? avgBlockTime : null,
        estimatedDailyTxs: estimatedDailyTxs > 0 ? estimatedDailyTxs : null,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [chainMetrics.chainId, chainMetrics.date],
        set: {
          latestBlockNumber: latestNum,
          recentTxCount,
          avgGasPrice,
          avgBlockTime: avgBlockTime > 0 ? avgBlockTime : null,
          estimatedDailyTxs: estimatedDailyTxs > 0 ? estimatedDailyTxs : null,
          updatedAt: new Date(),
        },
      });

    return true;
  } catch (err) {
    console.warn(
      `[fetch-evm-metrics] Failed for chain ${chain.id}: ${err instanceof Error ? err.message : err}`,
    );
    return false;
  }
}

export async function fetchEvmMetrics(db: Database): Promise<number> {
  console.log("[fetch-evm-metrics] Getting EVM chains with RPC URLs...");

  const evmChains = await db
    .select({ id: chains.id, rpcUrl: chains.rpcUrl })
    .from(chains)
    .where(
      and(
        eq(chains.enabled, true),
        eq(chains.isEvm, true),
        isNotNull(chains.rpcUrl),
      ),
    );

  console.log(`[fetch-evm-metrics] Processing ${evmChains.length} EVM chains...`);
  const today = todayDateString();
  let success = 0;

  // Process with concurrency limit
  const queue = evmChains.map((c) => ({
    id: c.id,
    rpcUrl: c.rpcUrl!,
  }));

  for (let i = 0; i < queue.length; i += CONCURRENCY_LIMIT) {
    const batch = queue.slice(i, i + CONCURRENCY_LIMIT);
    const results = await Promise.allSettled(
      batch.map((c) => processChain(db, c, today)),
    );
    success += results.filter(
      (r) => r.status === "fulfilled" && r.value,
    ).length;
  }

  console.log(`[fetch-evm-metrics] Successfully processed ${success}/${evmChains.length} chains`);
  return success;
}
