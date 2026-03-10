import { eq, and, isNotNull } from "drizzle-orm";
import { chains, chainMetrics } from "@palladium/shared/db/schema";
import { KNOWN_CHAINS_BY_EVM_ID } from "@palladium/shared/constants";
import { todayDateString } from "@palladium/shared/utils";
import { fetchAllChainsTvl } from "../../clients/defillama.js";
import type { Database } from "@palladium/shared/db";

// Common non-Avalanche EVM chain IDs that could cause false TVL matches
const SKIP_TVL_CHAIN_IDS = new Set([
  1, 5, 10, 56, 97, 100, 137, 250, 324, 1101, 8453, 42161, 43114, 59144, 534352,
]);

export async function fetchTvl(db: Database): Promise<number> {
  console.log("[fetch-tvl] Fetching TVL data from DeFiLlama...");
  const llamaChains = await fetchAllChainsTvl();
  console.log(`[fetch-tvl] Got ${llamaChains.length} chains from DeFiLlama`);

  // Build lookup maps
  const tvlByChainId = new Map<number, number>();
  const tvlByName = new Map<string, number>();

  for (const lc of llamaChains) {
    if (lc.chainId && lc.tvl > 0) {
      tvlByChainId.set(lc.chainId, lc.tvl);
    }
    if (lc.name && lc.tvl > 0) {
      tvlByName.set(lc.name, lc.tvl);
    }
  }

  // Get active chains with evmChainId
  const enabledChains = await db
    .select({
      id: chains.id,
      blockchainId: chains.blockchainId,
      evmChainId: chains.evmChainId,
    })
    .from(chains)
    .where(and(eq(chains.isActive, true), isNotNull(chains.evmChainId)));

  const today = todayDateString();
  let matched = 0;

  for (const chain of enabledChains) {
    let tvl: number | undefined;

    // 1. Try matching by evmChainId (skip well-known non-Avalanche IDs)
    if (chain.evmChainId && !SKIP_TVL_CHAIN_IDS.has(chain.evmChainId)) {
      tvl = tvlByChainId.get(chain.evmChainId);
    }

    // 2. Try matching by curated defillamaId
    if (!tvl && chain.evmChainId) {
      const known = KNOWN_CHAINS_BY_EVM_ID[chain.evmChainId];
      if (known?.defillamaId) {
        tvl = tvlByName.get(known.defillamaId);
      }
    }

    if (tvl && tvl > 0) {
      await db
        .insert(chainMetrics)
        .values({
          chainId: chain.id,
          date: today,
          tvlUsd: tvl,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [chainMetrics.chainId, chainMetrics.date],
          set: {
            tvlUsd: tvl,
            updatedAt: new Date(),
          },
        });
      matched++;
    }
  }

  console.log(`[fetch-tvl] Matched TVL for ${matched} chains`);
  return matched;
}
