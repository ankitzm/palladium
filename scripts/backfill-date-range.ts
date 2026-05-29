/**
 * Backfill metrics for a range of dates, for all or specific chains.
 * Iterates through each date and runs the full ingestion pipeline.
 *
 * Note: TVL and EVM metrics reflect *current* state regardless of date,
 * since DeFiLlama and RPCs don't provide historical snapshots.
 * Validator counts similarly reflect current state.
 * This is useful for seeding initial time-series rows so charts render.
 *
 * Usage:
 *   pnpm --filter @palladium/server exec tsx ../../scripts/backfill-date-range.ts --from 2026-03-01 --to 2026-03-07
 *   pnpm --filter @palladium/server exec tsx ../../scripts/backfill-date-range.ts --from 2026-03-01 --to 2026-03-07 --slugs dfk-chain,beam
 */
import "dotenv/config";
import { eq, and, isNotNull, inArray } from "drizzle-orm";
import { createDb } from "@palladium/shared/db";
import { chains, chainMetrics } from "@palladium/shared/db/schema";
import { KNOWN_CHAINS_BY_EVM_ID } from "@palladium/shared/constants";
import { PRIMARY_NETWORK_SUBNET_ID } from "@palladium/shared/utils";
import { fetchCurrentValidators } from "../apps/server/src/clients/pchain.js";
import { fetchAllChainsTvl } from "../apps/server/src/clients/defillama.js";
import {
  fetchBlockNumber,
  fetchBlockByNumber,
} from "../apps/server/src/clients/evm-rpc.js";
import { fetchSupportedChains, fetchChainMetric } from "../apps/server/src/clients/avacloud.js";
import type { AvaCloudMetricName } from "../apps/server/src/clients/avacloud.js";

// ─── Parse CLI args ─────────────────────────────────────────────────
const args = process.argv.slice(2);
function getArg(name: string): string | undefined {
  const idx = args.indexOf(`--${name}`);
  return idx !== -1 ? args[idx + 1] : undefined;
}

const fromArg = getArg("from");
const toArg = getArg("to");
const slugsArg = getArg("slugs");

if (!fromArg || !toArg) {
  console.error("Usage: --from YYYY-MM-DD --to YYYY-MM-DD [--slugs slug1,slug2]");
  process.exit(1);
}

const SKIP_TVL_CHAIN_IDS = new Set([
  1, 5, 10, 56, 97, 100, 137, 250, 324, 1101, 8453, 42161, 43114, 59144,
  534352,
]);

// ─── Generate date range ────────────────────────────────────────────
function getDates(from: string, to: string): string[] {
  const dates: string[] = [];
  const current = new Date(from + "T00:00:00Z");
  const end = new Date(to + "T00:00:00Z");
  while (current <= end) {
    dates.push(current.toISOString().split("T")[0]);
    current.setUTCDate(current.getUTCDate() + 1);
  }
  return dates;
}

// ─── Main ───────────────────────────────────────────────────────────
async function main() {
  const db = createDb(process.env.DATABASE_URL!);
  const dates = getDates(fromArg!, toArg!);
  const start = Date.now();

  console.log(`\nBackfill: ${dates.length} dates (${fromArg} to ${toArg})`);

  // Resolve target chains
  let targetChains: (typeof chains.$inferSelect)[];
  if (slugsArg) {
    const slugList = slugsArg.split(",").map((s) => s.trim()).filter(Boolean);
    targetChains = await db.select().from(chains).where(inArray(chains.slug, slugList));
    const found = new Set(targetChains.map((c) => c.slug));
    const missing = slugList.filter((s) => !found.has(s));
    if (missing.length) console.warn(`  Warning: slugs not found: ${missing.join(", ")}`);
  } else {
    targetChains = await db.select().from(chains).where(eq(chains.enabled, true));
  }

  console.log(`Target: ${targetChains.length} chains\n`);

  // Pre-fetch external data once (doesn't change per date)
  console.log("Pre-fetching external data...");

  // Validators: group by subnet
  const subnetToChains = new Map<string, typeof targetChains>();
  for (const chain of targetChains) {
    if (chain.subnetId === PRIMARY_NETWORK_SUBNET_ID) continue;
    const existing = subnetToChains.get(chain.subnetId) ?? [];
    existing.push(chain);
    subnetToChains.set(chain.subnetId, existing);
  }

  const subnetValidators = new Map<string, { count: number; weight: number }>();
  const subnetEntries = [...subnetToChains.entries()];
  for (let i = 0; i < subnetEntries.length; i += 10) {
    const batch = subnetEntries.slice(i, i + 10);
    const results = await Promise.allSettled(
      batch.map(async ([subnetId]) => {
        const validators = await fetchCurrentValidators(subnetId);
        const totalWeight = validators.reduce(
          (sum, v) => sum + (v.weight ? parseInt(v.weight) : 0),
          0,
        );
        return { subnetId, count: validators.length, weight: totalWeight };
      }),
    );
    for (const r of results) {
      if (r.status === "fulfilled") {
        subnetValidators.set(r.value.subnetId, {
          count: r.value.count,
          weight: r.value.weight,
        });
      }
    }
  }
  console.log(`  Validators: fetched for ${subnetValidators.size} subnets`);

  // TVL
  const llamaChains = await fetchAllChainsTvl();
  const tvlByChainId = new Map<number, number>();
  const tvlByName = new Map<string, number>();
  for (const lc of llamaChains) {
    if (lc.chainId && lc.tvl > 0) tvlByChainId.set(lc.chainId, lc.tvl);
    if (lc.name && lc.tvl > 0) tvlByName.set(lc.name, lc.tvl);
  }
  console.log(`  DeFiLlama: ${llamaChains.length} chains`);

  // EVM: pre-fetch current block data with multi-block sampling
  const SAMPLE_POINTS = 50;
  const MAX_LOOKBACK_BLOCKS = 50000;
  const MIN_LOOKBACK_BLOCKS = 100;

  const evmData = new Map<
    number,
    {
      latestBlockNumber: number;
      recentTxCount: number;
      avgGasPrice: number | null;
      avgBlockTime: number | null;
      estimatedDailyTxs: number | null;
    }
  >();

  const evmTargets = targetChains.filter((c) => c.isEvm && c.rpcUrl);
  for (let i = 0; i < evmTargets.length; i += 5) {
    const batch = evmTargets.slice(i, i + 5);
    const results = await Promise.allSettled(
      batch.map(async (chain) => {
        const rpcUrl = chain.rpcUrl!;
        const latestNum = await fetchBlockNumber(rpcUrl);
        if (latestNum <= 0) return;

        const latestBlock = await fetchBlockByNumber(rpcUrl, latestNum);
        const latestTs = parseInt(latestBlock.timestamp, 16);

        // Estimate block time from a small probe
        const probeBlockNum = Math.max(0, latestNum - 100);
        const probeBlock = await fetchBlockByNumber(rpcUrl, probeBlockNum);
        const probeTs = parseInt(probeBlock.timestamp, 16);
        const probeDiff = latestNum - probeBlockNum;
        const estimatedBlockTime = probeDiff > 0 ? (latestTs - probeTs) / probeDiff : 2;

        // Calculate lookback range
        const blocksIn24h = estimatedBlockTime > 0 ? Math.round(86400 / estimatedBlockTime) : 43200;
        const lookback = Math.max(MIN_LOOKBACK_BLOCKS, Math.min(MAX_LOOKBACK_BLOCKS, blocksIn24h, latestNum));
        const oldestBlockNum = Math.max(0, latestNum - lookback);

        const oldestBlock = await fetchBlockByNumber(rpcUrl, oldestBlockNum);
        const oldestTs = parseInt(oldestBlock.timestamp, 16);
        const timeSpanSeconds = latestTs - oldestTs;
        if (timeSpanSeconds <= 0) return;

        const actualBlockDiff = latestNum - oldestBlockNum;
        const avgBlockTime = actualBlockDiff > 0 ? timeSpanSeconds / actualBlockDiff : estimatedBlockTime;

        // Sample blocks evenly across the range
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

        evmData.set(chain.id, {
          latestBlockNumber: latestNum,
          recentTxCount: latestBlock.transactions.length,
          avgGasPrice,
          avgBlockTime: avgBlockTime > 0 ? avgBlockTime : null,
          estimatedDailyTxs: estimatedDailyTxs > 0 ? estimatedDailyTxs : null,
        });
      }),
    );
  }
  console.log(`  EVM: fetched for ${evmData.size} chains (multi-block sampling)\n`);

  // ── Step 4: Fetch AvaCloud historical metrics ─────────────────────
  console.log("Fetching AvaCloud historical metrics...");
  const supportedChains_ = await fetchSupportedChains();
  const supportedEvmIds = new Set(supportedChains_.map((c) => c.evmChainId));
  console.log(`  ${supportedEvmIds.size} mainnet chains supported by AvaCloud`);

  // For each eligible chain, fetch N days of historical data for key metrics
  const avaMetricNames: AvaCloudMetricName[] = [
    "txCount", "activeAddresses", "cumulativeAddresses",
    "avgTps", "maxTps", "gasUsed", "avgGasPrice",
  ];

  // Map: chainId -> dateStr -> { txCount, activeAddresses, ... }
  type AvaDay = {
    txCount: number | null;
    activeAddresses: number | null;
    cumulativeAddresses: number | null;
    avgTps: number | null;
    maxTps: number | null;
    gasUsed: number | null;
    avgGasPrice: number | null;
  };
  const avaHistorical = new Map<number, Map<string, AvaDay>>();

  const eligibleAva = targetChains.filter(
    (c) => c.evmChainId !== null && c.isEvm && supportedEvmIds.has(c.evmChainId!),
  );

  for (let i = 0; i < eligibleAva.length; i += 5) {
    const batch = eligibleAva.slice(i, i + 5);
    await Promise.allSettled(
      batch.map(async (chain) => {
        const evmId = chain.evmChainId!;
        const dayMap = new Map<string, AvaDay>();

        // Fetch each metric with enough pageSize for our date range
        const results = await Promise.allSettled(
          avaMetricNames.map((m) =>
            fetchChainMetric(evmId, m, { timeInterval: "day", pageSize: dates.length + 2 }),
          ),
        );

        // Build a timestamp->dateStr lookup
        for (let mIdx = 0; mIdx < avaMetricNames.length; mIdx++) {
          const r = results[mIdx];
          if (r.status !== "fulfilled") continue;
          for (const dp of r.value) {
            const d = new Date(dp.timestamp * 1000).toISOString().split("T")[0];
            if (!dayMap.has(d)) {
              dayMap.set(d, {
                txCount: null, activeAddresses: null, cumulativeAddresses: null,
                avgTps: null, maxTps: null, gasUsed: null, avgGasPrice: null,
              });
            }
            const entry = dayMap.get(d)!;
            (entry as any)[avaMetricNames[mIdx]] = dp.value;
          }
        }

        avaHistorical.set(chain.id, dayMap);
        const daysWithData = [...dayMap.values()].filter((d) => d.txCount !== null).length;
        if (daysWithData > 0) {
          console.log(`  ✓ ${chain.name} (${evmId}): ${daysWithData} days of AvaCloud data`);
        }
      }),
    );
  }
  console.log(`  AvaCloud: fetched historical data for ${avaHistorical.size} chains\n`);

  // ── Insert for each date ──────────────────────────────────────────
  for (const date of dates) {
    const dateStart = Date.now();
    let rows = 0;

    for (const chain of targetChains) {
      // Validators
      const valData = subnetValidators.get(chain.subnetId);
      if (valData) {
        await db
          .insert(chainMetrics)
          .values({
            chainId: chain.id,
            date,
            validatorCount: valData.count,
            totalStakeWeight: valData.weight || null,
            updatedAt: new Date(),
          })
          .onConflictDoUpdate({
            target: [chainMetrics.chainId, chainMetrics.date],
            set: {
              validatorCount: valData.count,
              totalStakeWeight: valData.weight || null,
              updatedAt: new Date(),
            },
          });
        rows++;
      }

      // TVL
      if (chain.evmChainId && !SKIP_TVL_CHAIN_IDS.has(chain.evmChainId)) {
        let tvl = tvlByChainId.get(chain.evmChainId);
        if (!tvl) {
          const known = KNOWN_CHAINS_BY_EVM_ID[chain.evmChainId];
          if (known?.defillamaId) tvl = tvlByName.get(known.defillamaId);
        }
        if (tvl && tvl > 0) {
          await db
            .insert(chainMetrics)
            .values({ chainId: chain.id, date, tvlUsd: tvl, updatedAt: new Date() })
            .onConflictDoUpdate({
              target: [chainMetrics.chainId, chainMetrics.date],
              set: { tvlUsd: tvl, updatedAt: new Date() },
            });
        }
      }

      // EVM
      const evm = evmData.get(chain.id);
      if (evm) {
        await db
          .insert(chainMetrics)
          .values({
            chainId: chain.id,
            date,
            latestBlockNumber: evm.latestBlockNumber,
            recentTxCount: evm.recentTxCount,
            avgGasPrice: evm.avgGasPrice,
            avgBlockTime: evm.avgBlockTime,
            estimatedDailyTxs: evm.estimatedDailyTxs,
            updatedAt: new Date(),
          })
          .onConflictDoUpdate({
            target: [chainMetrics.chainId, chainMetrics.date],
            set: {
              latestBlockNumber: evm.latestBlockNumber,
              recentTxCount: evm.recentTxCount,
              avgGasPrice: evm.avgGasPrice,
              avgBlockTime: evm.avgBlockTime,
              estimatedDailyTxs: evm.estimatedDailyTxs,
              updatedAt: new Date(),
            },
          });
      }

      // AvaCloud historical (overwrites EVM estimates with accurate data)
      const avaChainData = avaHistorical.get(chain.id);
      if (avaChainData) {
        const avaDay = avaChainData.get(date);
        if (avaDay && (avaDay.txCount !== null || avaDay.activeAddresses !== null)) {
          await db
            .insert(chainMetrics)
            .values({
              chainId: chain.id,
              date,
              actualDailyTxs: avaDay.txCount,
              activeAddresses: avaDay.activeAddresses,
              cumulativeAddresses: avaDay.cumulativeAddresses,
              tps: avaDay.avgTps,
              peakTps: avaDay.maxTps,
              avgGasConsumption: avaDay.gasUsed,
              updatedAt: new Date(),
            })
            .onConflictDoUpdate({
              target: [chainMetrics.chainId, chainMetrics.date],
              set: {
                actualDailyTxs: avaDay.txCount,
                activeAddresses: avaDay.activeAddresses,
                cumulativeAddresses: avaDay.cumulativeAddresses,
                tps: avaDay.avgTps,
                peakTps: avaDay.maxTps,
                avgGasConsumption: avaDay.gasUsed,
                updatedAt: new Date(),
              },
            });
        }
      }
    }

    const ms = Date.now() - dateStart;
    console.log(`  [${date}] ${rows} metric rows in ${ms}ms`);
  }

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`\nBackfill complete in ${elapsed}s.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
