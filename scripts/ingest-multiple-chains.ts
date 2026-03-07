/**
 * Ingest all metrics for multiple chains by slug.
 *
 * Usage:
 *   pnpm --filter @palladium/server exec tsx ../../scripts/ingest-multiple-chains.ts --slugs dfk-chain,beam,dexalotevm
 *   pnpm --filter @palladium/server exec tsx ../../scripts/ingest-multiple-chains.ts --slugs dfk-chain,beam --date 2026-03-01
 */
import "dotenv/config";
import { eq, and, inArray, isNotNull } from "drizzle-orm";
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

// ─── Parse CLI args ─────────────────────────────────────────────────
const args = process.argv.slice(2);
function getArg(name: string): string | undefined {
  const idx = args.indexOf(`--${name}`);
  return idx !== -1 ? args[idx + 1] : undefined;
}

const slugsArg = getArg("slugs");
const dateArg = getArg("date") ?? new Date().toISOString().split("T")[0];

if (!slugsArg) {
  console.error("Usage: --slugs slug1,slug2,slug3 [--date YYYY-MM-DD]");
  process.exit(1);
}

const slugList = slugsArg.split(",").map((s) => s.trim()).filter(Boolean);

const SKIP_TVL_CHAIN_IDS = new Set([
  1, 5, 10, 56, 97, 100, 137, 250, 324, 1101, 8453, 42161, 43114, 59144,
  534352,
]);

const CONCURRENCY = 5;

// ─── Per-chain ingestion ────────────────────────────────────────────
async function ingestChain(
  db: ReturnType<typeof createDb>,
  chain: typeof chains.$inferSelect,
  date: string,
  tvlByChainId: Map<number, number>,
  tvlByName: Map<string, number>,
) {
  const results: string[] = [];

  // Validators
  if (chain.subnetId !== PRIMARY_NETWORK_SUBNET_ID) {
    try {
      const validators = await fetchCurrentValidators(chain.subnetId);
      const totalWeight = validators.reduce(
        (sum, v) => sum + (v.weight ? parseInt(v.weight) : 0),
        0,
      );
      await db
        .insert(chainMetrics)
        .values({
          chainId: chain.id,
          date,
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
      results.push(`validators=${validators.length}`);
    } catch (err) {
      results.push(`validators=ERR`);
    }
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
      results.push(`tvl=$${tvl.toLocaleString()}`);
    }
  }

  // EVM metrics
  if (chain.isEvm && chain.rpcUrl) {
    try {
      const latestNum = await fetchBlockNumber(chain.rpcUrl);
      const olderNum = Math.max(0, latestNum - 10);
      const [latestBlock, olderBlock] = await Promise.all([
        fetchBlockByNumber(chain.rpcUrl, latestNum),
        fetchBlockByNumber(chain.rpcUrl, olderNum),
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
          date,
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
      results.push(`block=${latestNum}, dailyTxs=${estimatedDailyTxs}`);
    } catch (err) {
      results.push(`evm=ERR`);
    }
  }

  return results;
}

// ─── Main ───────────────────────────────────────────────────────────
async function main() {
  const db = createDb(process.env.DATABASE_URL!);

  // Resolve chains
  const chainRows = await db
    .select()
    .from(chains)
    .where(inArray(chains.slug, slugList));

  const found = new Set(chainRows.map((c) => c.slug));
  const missing = slugList.filter((s) => !found.has(s));
  if (missing.length) {
    console.warn(`Warning: these slugs not found: ${missing.join(", ")}`);
  }

  if (chainRows.length === 0) {
    console.error("No matching chains found.");
    process.exit(1);
  }

  console.log(`\nIngesting ${chainRows.length} chains for date ${dateArg}\n`);

  // Pre-fetch DeFiLlama data once (shared across all chains)
  console.log("Fetching DeFiLlama TVL data...");
  const llamaChains = await fetchAllChainsTvl();
  const tvlByChainId = new Map<number, number>();
  const tvlByName = new Map<string, number>();
  for (const lc of llamaChains) {
    if (lc.chainId && lc.tvl > 0) tvlByChainId.set(lc.chainId, lc.tvl);
    if (lc.name && lc.tvl > 0) tvlByName.set(lc.name, lc.tvl);
  }

  // Process chains with concurrency
  for (let i = 0; i < chainRows.length; i += CONCURRENCY) {
    const batch = chainRows.slice(i, i + CONCURRENCY);
    const results = await Promise.allSettled(
      batch.map((chain) =>
        ingestChain(db, chain, dateArg, tvlByChainId, tvlByName),
      ),
    );

    for (let j = 0; j < batch.length; j++) {
      const r = results[j];
      const chain = batch[j];
      if (r.status === "fulfilled") {
        console.log(`  [${chain.slug}] ${r.value.join(", ") || "no data sources"}`);
      } else {
        console.error(`  [${chain.slug}] FAILED: ${r.reason}`);
      }
    }
  }

  console.log("\nDone.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
