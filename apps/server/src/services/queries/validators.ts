import { and, asc, desc, eq, sql } from "drizzle-orm";
import { chains, chainValidators } from "@palladium/shared/db/schema";
import type { Database } from "@palladium/shared/db";

export interface ValidatorRow {
  nodeId: string;
  weight: number | null;
  uptimePercent: number | null;
  isConnected: boolean | null;
  startTime: number | null;
  delegatorCount: number | null;
  chain: {
    slug: string;
    name: string;
    isFeatured: boolean;
  };
}

interface ListValidatorsOptions {
  sort?: "weight" | "uptime";
  order?: "asc" | "desc";
  limit?: number;
  offset?: number;
}

// Cross-chain validator listing — joins chain_validators to its chain. Mirrors
// the listChains shape (rows + total) for the validators directory page.
export async function listValidators(
  db: Database,
  opts: ListValidatorsOptions = {},
): Promise<{ validators: ValidatorRow[]; total: number }> {
  const { sort = "weight", order = "desc", limit = 100, offset = 0 } = opts;
  const cappedLimit = Math.min(limit, 200);

  const sortCol =
    sort === "uptime"
      ? sql`COALESCE(${chainValidators.uptimePercent}, 0)`
      : sql`COALESCE(${chainValidators.weight}, 0)`;

  const rows = await db
    .select({
      nodeId: chainValidators.nodeId,
      weight: chainValidators.weight,
      uptimePercent: chainValidators.uptimePercent,
      isConnected: chainValidators.isConnected,
      startTime: chainValidators.startTime,
      delegatorCount: chainValidators.delegatorCount,
      slug: chains.slug,
      name: chains.name,
      isFeatured: chains.isFeatured,
    })
    .from(chainValidators)
    .innerJoin(chains, eq(chainValidators.chainId, chains.id))
    .where(eq(chains.enabled, true))
    .orderBy(order === "asc" ? asc(sortCol) : desc(sortCol))
    .limit(cappedLimit)
    .offset(offset);

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(chainValidators)
    .innerJoin(chains, eq(chainValidators.chainId, chains.id))
    .where(eq(chains.enabled, true));

  const validators: ValidatorRow[] = rows.map((r) => ({
    nodeId: r.nodeId,
    weight: r.weight,
    uptimePercent: r.uptimePercent,
    isConnected: r.isConnected,
    startTime: r.startTime,
    delegatorCount: r.delegatorCount,
    chain: { slug: r.slug, name: r.name, isFeatured: r.isFeatured },
  }));

  return { validators, total: Number(count) };
}
