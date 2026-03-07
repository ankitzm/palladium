/**
 * Ingest all metrics (validators, TVL, EVM) for a single chain.
 *
 * Usage:
 *   pnpm --filter @palladium/server exec tsx ../../scripts/ingest-single-chain.ts --slug dfk-chain
 *   pnpm --filter @palladium/server exec tsx ../../scripts/ingest-single-chain.ts --id 711
 *   pnpm --filter @palladium/server exec tsx ../../scripts/ingest-single-chain.ts --slug beam --date 2026-03-01
 */
import "dotenv/config";
import { eq, and } from "drizzle-orm";
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

const slugArg = getArg("slug");
const idArg = getArg("id");
const dateArg = getArg("date") ?? new Date().toISOString().split("T")[0];

if (!slugArg && !idArg) {
  console.error("Usage: --slug <chain-slug> | --id <chain-db-id> [--date YYYY-MM-DD]");
  process.exit(1);
}

// ─── SKIP TVL chain IDs (non-Avalanche) ─────────────────────────────
const SKIP_TVL_CHAIN_IDS = new Set([
  1, 5, 10, 56, 97, 100, 137, 250, 324, 1101, 8453, 42161, 43114, 59144,
  534352,
]);

// ─── Main ───────────────────────────────────────────────────────────
async function main() {
  const db = createDb(process.env.DATABASE_URL!);

  // 1. Resolve chain
  const condition = slugArg ? eq(chains.slug, slugArg) : eq(chains.id, Number(idArg));
  const [chain] = await db.select().from(chains).where(condition);

  if (!chain) {
    console.error(`Chain not found: ${slugArg ?? idArg}`);
    process.exit(1);
  }

  console.log(`\nIngesting: ${chain.name} (id=${chain.id}, slug=${chain.slug})`);
  console.log(`Date: ${dateArg}\n`);

  // 2. Fetch validators
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
      console.log(`  [validators] ${validators.length} validators, weight=${totalWeight}`);
    } catch (err) {
      console.warn(`  [validators] FAILED: ${err instanceof Error ? err.message : err}`);
    }
  } else {
    console.log("  [validators] Skipped (primary network)");
  }

  // 3. Fetch TVL
  if (chain.evmChainId && !SKIP_TVL_CHAIN_IDS.has(chain.evmChainId)) {
    try {
      const llamaChains = await fetchAllChainsTvl();
      const tvlByChainId = new Map<number, number>();
      const tvlByName = new Map<string, number>();

      for (const lc of llamaChains) {
        if (lc.chainId && lc.tvl > 0) tvlByChainId.set(lc.chainId, lc.tvl);
        if (lc.name && lc.tvl > 0) tvlByName.set(lc.name, lc.tvl);
      }

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
        console.log(`  [tvl] $${tvl.toLocaleString()}`);
      } else {
        console.log("  [tvl] No match found in DeFiLlama");
      }
    } catch (err) {
      console.warn(`  [tvl] FAILED: ${err instanceof Error ? err.message : err}`);
    }
  } else {
    console.log("  [tvl] Skipped (no evmChainId or non-Avalanche ID)");
  }

  // 4. Fetch EVM metrics
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

      console.log(
        `  [evm] block=${latestNum}, blockTime=${avgBlockTime.toFixed(1)}s, ` +
          `txs=${recentTxCount}, dailyTxs=${estimatedDailyTxs}, gas=${avgGasPrice?.toFixed(1) ?? "n/a"} gwei`,
      );
    } catch (err) {
      console.warn(`  [evm] FAILED: ${err instanceof Error ? err.message : err}`);
    }
  } else {
    console.log(`  [evm] Skipped (isEvm=${chain.isEvm}, rpcUrl=${chain.rpcUrl ? "yes" : "no"})`);
  }

  console.log("\nDone.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
