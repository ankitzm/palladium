import { eq } from "drizzle-orm";
import { chains, chainMetrics } from "@palladium/shared/db/schema";
import { KNOWN_CHAINS_BY_EVM_ID } from "@palladium/shared/constants";
import { todayDateString } from "@palladium/shared/utils";
import {
  fetchAllChainsTvl,
  fetchPricesByGeckoId,
} from "../../clients/defillama.js";
import type { Database } from "@palladium/shared/db";

// TVL + native-token price from DeFiLlama. Per-L1 TVL is genuinely sparse on
// DeFiLlama (most subnets aren't tracked), so we match ONLY by exact chainId or
// curated gecko_id — no fuzzy name matching (that produced false positives and
// required the old SKIP_TVL_CHAIN_IDS blocklist). Unmatched chains keep null TVL,
// which is honest. We also resolve a native-token USD price per matched chain.
export async function fetchTvl(db: Database): Promise<number> {
  console.log("[fetch-tvl] Fetching chains from DeFiLlama...");
  const llamaChains = await fetchAllChainsTvl();
  console.log(`[fetch-tvl] Got ${llamaChains.length} DeFiLlama chains`);

  // Exact lookups only.
  const tvlByChainId = new Map<number, number>();
  const geckoByChainId = new Map<number, string>();
  const tvlByGecko = new Map<string, number>();
  for (const lc of llamaChains) {
    if (lc.chainId != null && lc.tvl > 0) tvlByChainId.set(lc.chainId, lc.tvl);
    if (lc.gecko_id) {
      if (lc.tvl > 0) tvlByGecko.set(lc.gecko_id, lc.tvl);
      if (lc.chainId != null) geckoByChainId.set(lc.chainId, lc.gecko_id);
    }
  }

  const activeChains = await db
    .select({ id: chains.id, evmChainId: chains.evmChainId, name: chains.name })
    .from(chains)
    .where(eq(chains.isActive, true));

  const today = todayDateString();

  // Resolve TVL + a gecko id per chain (for the price pass).
  interface Resolved {
    id: number;
    tvl: number | null;
    geckoId: string | null;
  }
  const resolved: Resolved[] = [];
  const geckoIds = new Set<string>();

  for (const chain of activeChains) {
    let tvl: number | null = null;
    let geckoId: string | null = null;

    if (chain.evmChainId != null) {
      tvl = tvlByChainId.get(chain.evmChainId) ?? null;
      geckoId = geckoByChainId.get(chain.evmChainId) ?? null;

      // Curated gecko id override (KNOWN_CHAINS_BY_EVM_ID.defillamaId may hold a
      // DeFiLlama chain name; treat it as a gecko id only if it resolves).
      const known = KNOWN_CHAINS_BY_EVM_ID[chain.evmChainId];
      if (!tvl && known?.defillamaId && tvlByGecko.has(known.defillamaId)) {
        tvl = tvlByGecko.get(known.defillamaId) ?? null;
        geckoId = geckoId ?? known.defillamaId;
      }
    }

    if (tvl != null || geckoId != null) {
      resolved.push({ id: chain.id, tvl, geckoId });
      if (geckoId) geckoIds.add(geckoId);
    }
  }

  // Batch-fetch native token prices for all resolved gecko ids.
  console.log(`[fetch-tvl] Resolving prices for ${geckoIds.size} tokens...`);
  const prices = await fetchPricesByGeckoId([...geckoIds]).catch(() => new Map());

  let matched = 0;
  for (const r of resolved) {
    const price = r.geckoId ? (prices.get(r.geckoId) ?? null) : null;
    if (r.tvl == null && price == null) continue;

    await db
      .insert(chainMetrics)
      .values({
        chainId: r.id,
        date: today,
        tvlUsd: r.tvl,
        nativeTokenPriceUsd: price,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [chainMetrics.chainId, chainMetrics.date],
        set: {
          tvlUsd: r.tvl,
          nativeTokenPriceUsd: price,
          updatedAt: new Date(),
        },
      });
    matched++;
  }

  console.log(
    `[fetch-tvl] Wrote TVL/price for ${matched} chains (TVL is sparse by design)`,
  );
  return matched;
}
