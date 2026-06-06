import { inArray, lt } from "drizzle-orm";
import { protocols, chains } from "@palladium/shared/db/schema";
import { fetchProtocols } from "../../clients/defillama.js";
import type { Database } from "@palladium/shared/db";

const BATCH = 50;

// DeFiLlama chain-key → candidate chain slug. "Avalanche" is the C-Chain (the
// Primary Network, which is NOT in our L1 index, so it has no slug — querying by
// chainKey=Avalanche still works). A few L1s are tracked by DeFiLlama under
// distinct keys; we only attach a chainSlug if that slug actually exists in our
// chains table (verified at ingest time), so the per-chain link is never dead.
const CHAIN_KEY_TO_SLUG: Record<string, string> = {
  Beam: "beam",
  DFK: "dfk-chain",
  Dexalot: "dexalotevm",
};

function baseChainKey(key: string): string | null {
  // Only Avalanche-family keys are relevant.
  const base = key.split("-")[0];
  if (base === "Avalanche" || base === "Beam" || base === "DFK" || base === "Dexalot") {
    return base;
  }
  return null;
}

// DeFi protocols with Avalanche-family TVL. One row per (protocol, chainKey).
export async function fetchProtocols_ingest(db: Database): Promise<number> {
  console.log("[protocols] Fetching DeFiLlama protocols...");
  const all = await fetchProtocols();

  // Only attach a chainSlug that actually exists in our index (avoid dead links).
  const candidateSlugs = [...new Set(Object.values(CHAIN_KEY_TO_SLUG))];
  const existing = await db
    .select({ slug: chains.slug })
    .from(chains)
    .where(inArray(chains.slug, candidateSlugs));
  const validSlugs = new Set(existing.map((r) => r.slug));

  // Aggregate per (protocol, base chain key) across sub-keys.
  interface Row {
    slug: string;
    name: string;
    category: string | null;
    logoUrl: string | null;
    url: string | null;
    chainKey: string;
    chainSlug: string | null;
    tvlUsd: number;
    change1d: number | null;
  }
  const rows = new Map<string, Row>();

  for (const p of all) {
    if (!p.chainTvls) continue;
    for (const [key, tvl] of Object.entries(p.chainTvls)) {
      const base = baseChainKey(key);
      if (!base || !(tvl > 0)) continue;
      const id = `${p.slug}::${base}`;
      const existing = rows.get(id);
      if (existing) {
        existing.tvlUsd += tvl;
      } else {
        rows.set(id, {
          slug: p.slug,
          name: p.name,
          category: p.category ?? null,
          logoUrl: p.logo ?? null,
          url: p.url ?? null,
          chainKey: base,
          chainSlug:
            CHAIN_KEY_TO_SLUG[base] && validSlugs.has(CHAIN_KEY_TO_SLUG[base])
              ? CHAIN_KEY_TO_SLUG[base]
              : null,
          tvlUsd: tvl,
          change1d: p.change_1d ?? null,
        });
      }
    }
  }

  const list = [...rows.values()];
  console.log(`[protocols] ${list.length} (protocol, chain) rows on Avalanche family`);

  const runStart = new Date();
  let processed = 0;
  for (let i = 0; i < list.length; i += BATCH) {
    const batch = list.slice(i, i + BATCH);
    await Promise.all(
      batch.map((r) =>
        db
          .insert(protocols)
          .values({ ...r, updatedAt: new Date() })
          .onConflictDoUpdate({
            target: [protocols.slug, protocols.chainKey],
            set: {
              name: r.name,
              category: r.category,
              logoUrl: r.logoUrl,
              url: r.url,
              chainSlug: r.chainSlug,
              tvlUsd: r.tvlUsd,
              change1d: r.change1d,
              updatedAt: new Date(),
            },
          }),
      ),
    );
    processed += batch.length;
  }

  // Prune protocols that dropped off this run.
  const pruned = await db
    .delete(protocols)
    .where(lt(protocols.updatedAt, runStart))
    .returning({ id: protocols.id });
  console.log(`[protocols] Upserted ${processed}; pruned ${pruned.length} stale`);
  return processed;
}
