/**
 * Full ingestion for all enabled chains, optionally for a custom date.
 * Same pipeline as `pnpm seed` but allows --date override.
 *
 * Usage:
 *   pnpm --filter @palladium/server exec tsx ../../scripts/ingest-all-chains.ts
 *   pnpm --filter @palladium/server exec tsx ../../scripts/ingest-all-chains.ts --date 2026-03-01
 */
import "dotenv/config";
import { eq, and, isNotNull } from "drizzle-orm";
import { createDb } from "@palladium/shared/db";
import { chains, chainMetrics } from "@palladium/shared/db/schema";
import { KNOWN_CHAINS_BY_EVM_ID } from "@palladium/shared/constants";
import { PRIMARY_NETWORK_SUBNET_ID } from "@palladium/shared/utils";
import { fetchAllBlockchains } from "../apps/server/src/clients/glacier.js";
import { fetchCurrentValidators } from "../apps/server/src/clients/pchain.js";
import { fetchAllChainsTvl } from "../apps/server/src/clients/defillama.js";
import {
  fetchBlockNumber,
  fetchBlockByNumber,
} from "../apps/server/src/clients/evm-rpc.js";
import { fetchSupportedChains, fetchAllChainMetrics } from "../apps/server/src/clients/avacloud.js";

// ─── Parse CLI args ─────────────────────────────────────────────────
const args = process.argv.slice(2);
function getArg(name: string): string | undefined {
  const idx = args.indexOf(`--${name}`);
  return idx !== -1 ? args[idx + 1] : undefined;
}

const dateArg = getArg("date") ?? new Date().toISOString().split("T")[0];
const CONCURRENCY = 10;

const SKIP_TVL_CHAIN_IDS = new Set([
  1, 5, 10, 56, 97, 100, 137, 250, 324, 1101, 8453, 42161, 43114, 59144,
  534352, 288, 1088, 1284, 1285, 25, 128, 66, 321, 106, 42220, 42262, 8217,
  2020, 169, 204, 81457, 1313161554, 7000, 40, 122, 592,
  1024, 336, 246, 199, 88, 108, 82, 30, 52, 820, 61, 20, 32520,
  1231, 361, 148, 2001, 2002,
]);

// EVM metrics multi-block sampling configuration
const SAMPLE_POINTS = 50;
const MAX_LOOKBACK_BLOCKS = 50000;
const MIN_LOOKBACK_BLOCKS = 100;

/**
 * Normalize a chain name for fuzzy matching
 */
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+(chain|network|subnet|protocol|l1|l2|mainnet|evm)\s*/gi, "")
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

// ─── Main ───────────────────────────────────────────────────────────
async function main() {
  const db = createDb(process.env.DATABASE_URL!);
  const start = Date.now();

  console.log(`\nFull ingestion for date: ${dateArg}\n`);

  // ── Step 1: Fetch validators ──────────────────────────────────────
  console.log("=== Step 1: Fetch validators ===");
  const chainRows = await db
    .select({ id: chains.id, subnetId: chains.subnetId })
    .from(chains)
    .where(eq(chains.enabled, true));

  const subnetToChains = new Map<string, number[]>();
  for (const row of chainRows) {
    if (row.subnetId === PRIMARY_NETWORK_SUBNET_ID) continue;
    const existing = subnetToChains.get(row.subnetId) ?? [];
    existing.push(row.id);
    subnetToChains.set(row.subnetId, existing);
  }

  const entries = [...subnetToChains.entries()];
  let valProcessed = 0;

  for (let i = 0; i < entries.length; i += CONCURRENCY) {
    const batch = entries.slice(i, i + CONCURRENCY);
    const results = await Promise.allSettled(
      batch.map(async ([subnetId, chainIds]) => {
        const validators = await fetchCurrentValidators(subnetId);
        const totalWeight = validators.reduce(
          (sum, v) => sum + (v.weight ? parseInt(v.weight) : 0),
          0,
        );
        for (const chainId of chainIds) {
          await db
            .insert(chainMetrics)
            .values({
              chainId,
              date: dateArg,
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
      }),
    );
    for (const r of results) {
      if (r.status === "fulfilled") valProcessed += r.value;
    }
    if ((i + CONCURRENCY) % 50 === 0 || i + CONCURRENCY >= entries.length) {
      console.log(`  Progress: ${Math.min(i + CONCURRENCY, entries.length)}/${entries.length} subnets`);
    }
  }
  console.log(`  Validators done: ${valProcessed} chains\n`);

  // ── Step 2: Fetch TVL (improved matching) ─────────────────────────
  console.log("=== Step 2: Fetch TVL (improved matching) ===");
  const llamaChains = await fetchAllChainsTvl();
  const tvlByChainId = new Map<number, number>();
  const tvlByName = new Map<string, number>();
  const tvlByNormalizedName = new Map<string, number>();
  for (const lc of llamaChains) {
    if (lc.chainId && lc.tvl > 0) tvlByChainId.set(lc.chainId, lc.tvl);
    if (lc.name && lc.tvl > 0) {
      tvlByName.set(lc.name, lc.tvl);
      tvlByNormalizedName.set(normalizeName(lc.name), lc.tvl);
    }
  }

  const enabledEvmChains = await db
    .select({ id: chains.id, evmChainId: chains.evmChainId, name: chains.name })
    .from(chains)
    .where(eq(chains.enabled, true));

  let tvlMatched = 0;
  for (const chain of enabledEvmChains) {
    let tvl: number | undefined;
    let matchMethod = "";

    // 1. evmChainId match
    if (chain.evmChainId && !SKIP_TVL_CHAIN_IDS.has(chain.evmChainId)) {
      tvl = tvlByChainId.get(chain.evmChainId);
      if (tvl) matchMethod = "evmChainId";
    }

    // 2. curated defillamaId
    if (!tvl && chain.evmChainId) {
      const known = KNOWN_CHAINS_BY_EVM_ID[chain.evmChainId];
      if (known?.defillamaId) {
        tvl = tvlByName.get(known.defillamaId);
        if (tvl) matchMethod = "defillamaId";
      }
    }

    // 3. exact name match
    if (!tvl && chain.name) {
      tvl = tvlByName.get(chain.name);
      if (tvl) matchMethod = "exactName";
    }

    // 4. fuzzy name match
    if (!tvl && chain.name) {
      const normalized = normalizeName(chain.name);
      if (normalized.length >= 3) {
        tvl = tvlByNormalizedName.get(normalized);
        if (tvl) matchMethod = "fuzzyName";
      }
    }

    if (tvl && tvl > 0) {
      await db
        .insert(chainMetrics)
        .values({ chainId: chain.id, date: dateArg, tvlUsd: tvl, updatedAt: new Date() })
        .onConflictDoUpdate({
          target: [chainMetrics.chainId, chainMetrics.date],
          set: { tvlUsd: tvl, updatedAt: new Date() },
        });
      tvlMatched++;
      console.log(`  ✓ ${chain.name} → $${(tvl / 1e6).toFixed(2)}M (${matchMethod})`);
    }
  }
  console.log(`  TVL matched: ${tvlMatched} chains\n`);

  // ── Step 3: Fetch EVM metrics (multi-block sampling) ──────────────
  console.log("=== Step 3: Fetch EVM metrics (multi-block sampling) ===");
  const evmChains = await db
    .select({ id: chains.id, rpcUrl: chains.rpcUrl, name: chains.name })
    .from(chains)
    .where(
      and(eq(chains.enabled, true), eq(chains.isEvm, true), isNotNull(chains.rpcUrl)),
    );

  let evmSuccess = 0;
  for (let i = 0; i < evmChains.length; i += 5) {
    const batch = evmChains.slice(i, i + 5);
    const results = await Promise.allSettled(
      batch.map(async (chain) => {
        const rpcUrl = chain.rpcUrl!;
        const latestNum = await fetchBlockNumber(rpcUrl);
        if (latestNum <= 0) return;

        // Fetch latest block for timestamp
        const latestBlock = await fetchBlockByNumber(rpcUrl, latestNum);
        const latestTs = parseInt(latestBlock.timestamp, 16);

        // Probe to estimate block time
        const probeBlockNum = Math.max(0, latestNum - 100);
        const probeBlock = await fetchBlockByNumber(rpcUrl, probeBlockNum);
        const probeTs = parseInt(probeBlock.timestamp, 16);
        const probeDiff = latestNum - probeBlockNum;
        const estimatedBlockTime = probeDiff > 0 ? (latestTs - probeTs) / probeDiff : 2;

        // Calculate lookback range
        const blocksIn24h = estimatedBlockTime > 0 ? Math.round(86400 / estimatedBlockTime) : 43200;
        const lookback = Math.max(MIN_LOOKBACK_BLOCKS, Math.min(MAX_LOOKBACK_BLOCKS, blocksIn24h, latestNum));
        const oldestBlockNum = Math.max(0, latestNum - lookback);

        // Get oldest block for accurate time measurement
        const oldestBlock = await fetchBlockByNumber(rpcUrl, oldestBlockNum);
        const oldestTs = parseInt(oldestBlock.timestamp, 16);
        const timeSpanSeconds = latestTs - oldestTs;
        if (timeSpanSeconds <= 0) return;

        const actualBlockDiff = latestNum - oldestBlockNum;
        const avgBlockTime = actualBlockDiff > 0 ? timeSpanSeconds / actualBlockDiff : estimatedBlockTime;

        // Sample blocks evenly
        const sampleBlockNums: number[] = [];
        const step = Math.max(1, Math.floor(lookback / SAMPLE_POINTS));
        for (let j = 0; j < SAMPLE_POINTS && (oldestBlockNum + j * step) <= latestNum; j++) {
          sampleBlockNums.push(oldestBlockNum + j * step);
        }
        if (sampleBlockNums[sampleBlockNums.length - 1] !== latestNum) {
          sampleBlockNums.push(latestNum);
        }

        // Fetch sample blocks
        const txCounts: number[] = [];
        const gasPrices: number[] = [];
        const BLOCK_BATCH = 10;
        for (let j = 0; j < sampleBlockNums.length; j += BLOCK_BATCH) {
          const batchNums = sampleBlockNums.slice(j, j + BLOCK_BATCH);
          const blocks = await Promise.allSettled(
            batchNums.map((bn) => fetchBlockByNumber(rpcUrl, bn)),
          );
          for (const result of blocks) {
            if (result.status === "fulfilled") {
              txCounts.push(result.value.transactions.length);
              if (result.value.baseFeePerGas) {
                gasPrices.push(parseInt(result.value.baseFeePerGas, 16) / 1e9);
              }
            }
          }
        }

        if (txCounts.length === 0) return;

        const totalSampledTxs = txCounts.reduce((sum, n) => sum + n, 0);
        const avgTxsPerBlock = totalSampledTxs / txCounts.length;
        const blocksPerDay = avgBlockTime > 0 ? 86400 / avgBlockTime : 0;
        const estimatedDailyTxs = Math.round(avgTxsPerBlock * blocksPerDay);
        const avgGasPrice = gasPrices.length > 0
          ? gasPrices.reduce((sum, g) => sum + g, 0) / gasPrices.length
          : null;
        const recentTxCount = latestBlock.transactions.length;

        console.log(
          `  ✓ ${chain.name}: ${txCounts.length} blocks, ` +
          `avg ${avgTxsPerBlock.toFixed(1)} txs/block, ` +
          `${avgBlockTime.toFixed(2)}s, ~${estimatedDailyTxs.toLocaleString()} daily txs`,
        );

        await db
          .insert(chainMetrics)
          .values({
            chainId: chain.id,
            date: dateArg,
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
      }),
    );
    evmSuccess += results.filter((r) => r.status === "fulfilled").length;
  }
  console.log(`  EVM metrics: ${evmSuccess}/${evmChains.length} chains\n`);

  // ── Step 4: Fetch AvaCloud metrics (accurate, pre-aggregated) ─────
  console.log("=== Step 4: Fetch AvaCloud metrics (accurate data) ===");
  const supportedChains_ = await fetchSupportedChains();
  const supportedEvmIds = new Set(supportedChains_.map((c) => c.evmChainId));
  console.log(`  ${supportedEvmIds.size} mainnet chains supported by AvaCloud`);

  const activeAvaChains = await db
    .select({ id: chains.id, evmChainId: chains.evmChainId, name: chains.name })
    .from(chains)
    .where(
      and(eq(chains.enabled, true), eq(chains.isEvm, true), isNotNull(chains.evmChainId)),
    );

  const eligibleAva = activeAvaChains.filter(
    (c) => c.evmChainId !== null && supportedEvmIds.has(c.evmChainId),
  );
  let avaSuccess = 0;

  for (let i = 0; i < eligibleAva.length; i += 5) {
    const batch = eligibleAva.slice(i, i + 5);
    const results = await Promise.allSettled(
      batch.map(async (chain) => {
        const data = await fetchAllChainMetrics(chain.evmChainId!);
        const stats: string[] = [];
        if (data.txCount !== null) stats.push(`txs=${data.txCount}`);
        if (data.activeAddresses !== null) stats.push(`addrs=${data.activeAddresses}`);
        if (data.avgTps !== null) stats.push(`tps=${data.avgTps.toFixed(2)}`);
        console.log(`  ✓ ${chain.name} (${chain.evmChainId}): ${stats.join(", ") || "no data"}`);

        await db
          .insert(chainMetrics)
          .values({
            chainId: chain.id,
            date: dateArg,
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
      }),
    );
    avaSuccess += results.filter((r) => r.status === "fulfilled").length;
  }
  console.log(`  AvaCloud metrics: ${avaSuccess}/${eligibleAva.length} chains\n`);

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`\nDone in ${elapsed}s.`);
  console.log(`  Validators: ${valProcessed} chains`);
  console.log(`  TVL: ${tvlMatched} chains`);
  console.log(`  EVM: ${evmSuccess} chains`);
  console.log(`  AvaCloud: ${avaSuccess} chains`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
