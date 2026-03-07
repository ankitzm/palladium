/**
 * Full ingestion for all enabled chains, optionally for a custom date.
 * Same pipeline as `pnpm seed` but allows --date override.
 *
 * Usage:
 *   pnpm --filter @palladium/server exec tsx ../../scripts/ingest-all-chains.ts
 *   pnpm --filter @palladium/server exec tsx ../../scripts/ingest-all-chains.ts --date 2026-03-01
 */
import "dotenv/config";
import { eq, and, isNotNull, inArray } from "drizzle-orm";
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
  534352,
]);

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

  // ── Step 2: Fetch TVL ─────────────────────────────────────────────
  console.log("=== Step 2: Fetch TVL ===");
  const llamaChains = await fetchAllChainsTvl();
  const tvlByChainId = new Map<number, number>();
  const tvlByName = new Map<string, number>();
  for (const lc of llamaChains) {
    if (lc.chainId && lc.tvl > 0) tvlByChainId.set(lc.chainId, lc.tvl);
    if (lc.name && lc.tvl > 0) tvlByName.set(lc.name, lc.tvl);
  }

  const enabledEvmChains = await db
    .select({ id: chains.id, evmChainId: chains.evmChainId })
    .from(chains)
    .where(and(eq(chains.enabled, true), isNotNull(chains.evmChainId)));

  let tvlMatched = 0;
  for (const chain of enabledEvmChains) {
    if (!chain.evmChainId || SKIP_TVL_CHAIN_IDS.has(chain.evmChainId)) continue;

    let tvl = tvlByChainId.get(chain.evmChainId);
    if (!tvl) {
      const known = KNOWN_CHAINS_BY_EVM_ID[chain.evmChainId];
      if (known?.defillamaId) tvl = tvlByName.get(known.defillamaId);
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
    }
  }
  console.log(`  TVL matched: ${tvlMatched} chains\n`);

  // ── Step 3: Fetch EVM metrics ─────────────────────────────────────
  console.log("=== Step 3: Fetch EVM metrics ===");
  const evmChains = await db
    .select({ id: chains.id, rpcUrl: chains.rpcUrl })
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
        const olderNum = Math.max(0, latestNum - 10);
        const [latestBlock, olderBlock] = await Promise.all([
          fetchBlockByNumber(rpcUrl, latestNum),
          fetchBlockByNumber(rpcUrl, olderNum),
        ]);
        const latestTs = parseInt(latestBlock.timestamp, 16);
        const olderTs = parseInt(olderBlock.timestamp, 16);
        const blockDiff = latestNum - olderNum;
        const avgBlockTime = blockDiff > 0 ? (latestTs - olderTs) / blockDiff : 0;
        const recentTxCount = latestBlock.transactions.length;
        const blocksPerDay = avgBlockTime > 0 ? 86400 / avgBlockTime : 0;
        const estimatedDailyTxs = Math.round(recentTxCount * blocksPerDay);
        const avgGasPrice = latestBlock.baseFeePerGas
          ? parseInt(latestBlock.baseFeePerGas, 16) / 1e9
          : null;

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

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`\nDone in ${elapsed}s.`);
  console.log(`  Validators: ${valProcessed} chains`);
  console.log(`  TVL: ${tvlMatched} chains`);
  console.log(`  EVM: ${evmSuccess} chains`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
