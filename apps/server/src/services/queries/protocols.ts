import { desc, eq, sql } from "drizzle-orm";
import { protocols } from "@palladium/shared/db/schema";
import type { Database } from "@palladium/shared/db";

export interface ProtocolRow {
  slug: string;
  name: string;
  category: string | null;
  logoUrl: string | null;
  url: string | null;
  chainKey: string;
  chainSlug: string | null;
  tvlUsd: number | null;
  change1d: number | null;
}

// Top DeFi protocols, optionally scoped to one chain (by our slug, e.g. "beam",
// or by the DeFiLlama chain key like "Avalanche" for the C-Chain).
export async function listProtocols(
  db: Database,
  opts: { chainSlug?: string; chainKey?: string; limit?: number } = {},
): Promise<{ protocols: ProtocolRow[]; total: number }> {
  const limit = Math.min(opts.limit ?? 50, 200);

  const where = opts.chainSlug
    ? eq(protocols.chainSlug, opts.chainSlug)
    : opts.chainKey
      ? eq(protocols.chainKey, opts.chainKey)
      : undefined;

  const rows = await db
    .select({
      slug: protocols.slug,
      name: protocols.name,
      category: protocols.category,
      logoUrl: protocols.logoUrl,
      url: protocols.url,
      chainKey: protocols.chainKey,
      chainSlug: protocols.chainSlug,
      tvlUsd: protocols.tvlUsd,
      change1d: protocols.change1d,
    })
    .from(protocols)
    .where(where)
    .orderBy(desc(sql`COALESCE(${protocols.tvlUsd}, 0)`))
    .limit(limit);

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(protocols)
    .where(where);

  return { protocols: rows, total: Number(count) };
}
