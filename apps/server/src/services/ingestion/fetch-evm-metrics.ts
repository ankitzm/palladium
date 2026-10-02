import { eq, and, isNotNull } from "drizzle-orm";
import { chains, chainMetrics } from "@palladium/shared/db/schema";
import { todayDateString } from "@palladium/shared/utils";
import { fetchBlockNumber, fetchBlockByNumber } from "../../clients/evm-rpc.js";
import type { Database } from "@palladium/shared/db";

const CONCURRENCY_LIMIT = 5;

/**
 * Number of evenly-spaced sample points across the block range.
 * Sampling more blocks gives a much more accurate daily tx estimate
 * compared to the old approach of sampling just 1 block.
 *
 * Strategy: Sample blocks spread across the last ~24 hours of blocks.
 * For each sampled block, count transactions.
 * Average across all samples to get txs/block, then multiply by blocks/day.
 */
const SAMPLE_POINTS = 50;

/**
 * We look back approximately 24 hours of blocks to estimate daily txs.
 * Most EVM chains produce blocks every 1-3 seconds.
 * At 2s block time: 43200 blocks/day.
 * We cap lookback to avoid going too far back on slow chains.
 */
const MAX_LOOKBACK_BLOCKS = 50000;
const MIN_LOOKBACK_BLOCKS = 100;

async function processChain(
  db: Database,
  chain: { id: number; rpcUrl: string; name?: string },
  today: string,
): Promise<boolean> {
  try {
    const latestNum = await fetchBlockNumber(chain.rpcUrl);
    if (latestNum <= 0) {
      console.warn(`[fetch-evm-metrics] Chain ${chain.id} has no blocks`);
      return false;
    }

    // Fetch the latest block to get its timestamp
    const latestBlock = await fetchBlockByNumber(chain.rpcUrl, latestNum);
    const latestTs = parseInt(latestBlock.timestamp, 16);

    // Determine how far back to go (~24 hours ago)
    // First, estimate block time from a small sample
    const probeBlockNum = Math.max(0, latestNum - 100);
    const probeBlock = await fetchBlockByNumber(chain.rpcUrl, probeBlockNum);
    const probeTs = parseInt(probeBlock.timestamp, 16);
    const probeDiff = latestNum - probeBlockNum;

    const estimatedBlockTime = probeDiff > 0
      ? (latestTs - probeTs) / probeDiff
      : 2; // default 2s if we can't calculate

    // Calculate blocks in 24 hours based on estimated block time
    const blocksIn24h = estimatedBlockTime > 0
      ? Math.round(86400 / estimatedBlockTime)
      : 43200; // default ~2s blocks

    // Determine the lookback range, capped
    const lookback = Math.max(
      MIN_LOOKBACK_BLOCKS,
      Math.min(MAX_LOOKBACK_BLOCKS, blocksIn24h, latestNum),
    );
    const oldestBlockNum = Math.max(0, latestNum - lookback);

    // Get the timestamp of the oldest block for accurate time measurement
    const oldestBlock = await fetchBlockByNumber(chain.rpcUrl, oldestBlockNum);
    const oldestTs = parseInt(oldestBlock.timestamp, 16);
    const timeSpanSeconds = latestTs - oldestTs;

    if (timeSpanSeconds <= 0) {
      console.warn(`[fetch-evm-metrics] Chain ${chain.id}: invalid time span`);
      return false;
    }

    // Calculate actual block time from the full range
    const actualBlockDiff = latestNum - oldestBlockNum;
    const avgBlockTime = actualBlockDiff > 0
      ? timeSpanSeconds / actualBlockDiff
      : estimatedBlockTime;

    // Sample blocks evenly across the range
    const sampleBlockNums: number[] = [];
    const step = Math.max(1, Math.floor(lookback / SAMPLE_POINTS));
    for (let i = 0; i < SAMPLE_POINTS && (oldestBlockNum + i * step) <= latestNum; i++) {
      sampleBlockNums.push(oldestBlockNum + i * step);
    }
    // Always include the latest block
    if (sampleBlockNums[sampleBlockNums.length - 1] !== latestNum) {
      sampleBlockNums.push(latestNum);
    }

    // Fetch all sample blocks in parallel (batched to avoid overloading RPCs)
    const txCounts: number[] = [];
    const gasPrices: number[] = [];

    const BLOCK_FETCH_BATCH = 10;
    for (let i = 0; i < sampleBlockNums.length; i += BLOCK_FETCH_BATCH) {
      const batch = sampleBlockNums.slice(i, i + BLOCK_FETCH_BATCH);
      const blocks = await Promise.allSettled(
        batch.map((bn) => fetchBlockByNumber(chain.rpcUrl, bn)),
      );

      for (const result of blocks) {
        if (result.status === "fulfilled") {
          const block = result.value;
          txCounts.push(block.transactions.length);
          if (block.baseFeePerGas) {
            gasPrices.push(parseInt(block.baseFeePerGas, 16) / 1e9);
          }
        }
      }
    }

    if (txCounts.length === 0) {
      console.warn(`[fetch-evm-metrics] Chain ${chain.id}: no blocks sampled successfully`);
      return false;
    }

    // Calculate accurate metrics
    const totalSampledTxs = txCounts.reduce((sum, n) => sum + n, 0);
    const avgTxsPerBlock = totalSampledTxs / txCounts.length;

    // Blocks per day from actual block time measurement
    const blocksPerDay = avgBlockTime > 0 ? 86400 / avgBlockTime : 0;
    const estimatedDailyTxs = Math.round(avgTxsPerBlock * blocksPerDay);

    // Average gas price across all sampled blocks
    const avgGasPrice = gasPrices.length > 0
      ? gasPrices.reduce((sum, g) => sum + g, 0) / gasPrices.length
      : null;

    // Recent tx count = sum of txs in last block (for display)
    const recentTxCount = latestBlock.transactions.length;

    console.log(
      `[fetch-evm-metrics] Chain ${chain.id}: ` +
      `${txCounts.length} blocks sampled, ` +
      `avg ${avgTxsPerBlock.toFixed(1)} txs/block, ` +
      `${avgBlockTime.toFixed(2)}s block time, ` +
      `~${estimatedDailyTxs.toLocaleString()} daily txs`,
    );

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
    .select({ id: chains.id, rpcUrl: chains.rpcUrl, name: chains.name })
    .from(chains)
    .where(
      and(
        eq(chains.isActive, true),
        eq(chains.isEvm, true),
        isNotNull(chains.rpcUrl),
      ),
    );

  console.log(`[fetch-evm-metrics] Processing ${evmChains.length} EVM chains with multi-block sampling...`);
  const today = todayDateString();
  let success = 0;

  // Process with concurrency limit
  const queue = evmChains.map((c) => ({
    id: c.id,
    rpcUrl: c.rpcUrl!,
    name: c.name,
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
