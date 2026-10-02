import { eq, and, isNotNull } from "drizzle-orm";
import { chains, chainMetrics } from "@palladium/shared/db/schema";
import { KNOWN_CHAINS_BY_EVM_ID } from "@palladium/shared/constants";
import { todayDateString } from "@palladium/shared/utils";
import { fetchAllChainsTvl } from "../../clients/defillama.js";
import type { Database } from "@palladium/shared/db";

// Common non-Avalanche EVM chain IDs that could cause false TVL matches
const SKIP_TVL_CHAIN_IDS = new Set([
  1, 5, 10, 56, 97, 100, 137, 250, 324, 1101, 8453, 42161, 43114, 59144, 534352,
  // Extra popular L2s / chains that share IDs with random subnets
  288, 1088, 1284, 1285, 25, 128, 66, 321, 106, 42220, 42262, 8217,
  2020, 169, 534352, 204, 81457, 1313161554, 7000, 40, 122, 592,
  1024, 336, 246, 199, 88, 108, 82, 30, 52, 820, 61, 20, 32520,
  1231, 361, 148, 2001, 2002,
]);

/**
 * Normalize a chain name for fuzzy matching.
 * Removes common suffixes, lowercases, strips non-alpha chars.
 */
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+(chain|network|subnet|protocol|l1|l2|mainnet|evm)\s*/gi, "")
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

export async function fetchTvl(db: Database): Promise<number> {
  console.log("[fetch-tvl] Fetching TVL data from DeFiLlama...");
  const llamaChains = await fetchAllChainsTvl();
  console.log(`[fetch-tvl] Got ${llamaChains.length} chains from DeFiLlama`);

  // Build multiple lookup maps for better matching
  const tvlByChainId = new Map<number, number>();
  const tvlByName = new Map<string, number>();
  const tvlByNormalizedName = new Map<string, number>();

  for (const lc of llamaChains) {
    if (lc.chainId && lc.tvl > 0) {
      tvlByChainId.set(lc.chainId, lc.tvl);
    }
    if (lc.name && lc.tvl > 0) {
      tvlByName.set(lc.name, lc.tvl);
      tvlByNormalizedName.set(normalizeName(lc.name), lc.tvl);
    }
  }

  // Get active chains
  const enabledChains = await db
    .select({
      id: chains.id,
      blockchainId: chains.blockchainId,
      evmChainId: chains.evmChainId,
      name: chains.name,
    })
    .from(chains)
    .where(eq(chains.isActive, true));

  const today = todayDateString();
  let matched = 0;

  for (const chain of enabledChains) {
    let tvl: number | undefined;
    let matchMethod = "";

    // 1. Try matching by evmChainId (skip well-known non-Avalanche IDs)
    if (chain.evmChainId && !SKIP_TVL_CHAIN_IDS.has(chain.evmChainId)) {
      tvl = tvlByChainId.get(chain.evmChainId);
      if (tvl) matchMethod = "evmChainId";
    }

    // 2. Try matching by curated defillamaId
    if (!tvl && chain.evmChainId) {
      const known = KNOWN_CHAINS_BY_EVM_ID[chain.evmChainId];
      if (known?.defillamaId) {
        tvl = tvlByName.get(known.defillamaId);
        if (tvl) matchMethod = "defillamaId";
      }
    }

    // 3. Try exact name match (case-sensitive)
    if (!tvl && chain.name) {
      tvl = tvlByName.get(chain.name);
      if (tvl) matchMethod = "exactName";
    }

    // 4. Try normalized/fuzzy name match
    if (!tvl && chain.name) {
      const normalized = normalizeName(chain.name);
      if (normalized.length >= 3) { // avoid matching too-short names
        tvl = tvlByNormalizedName.get(normalized);
        if (tvl) matchMethod = "fuzzyName";
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
      console.log(`[fetch-tvl] ✓ ${chain.name} → $${(tvl / 1e6).toFixed(2)}M (via ${matchMethod})`);
    }
  }

  console.log(`[fetch-tvl] Matched TVL for ${matched} chains`);
  return matched;
}
