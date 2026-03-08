import { eq, and, sql, desc, asc, ilike, or } from "drizzle-orm";
import { chains, chainMetrics, chainValidators } from "@palladium/shared/db/schema";
import type { Database } from "@palladium/shared/db";
import type { ChainWithMetrics } from "@palladium/shared/types";

interface ListChainsOptions {
  sort?: "name" | "tvl" | "validators" | "daily_txs";
  order?: "asc" | "desc";
  vmType?: string;
  category?: string;
  search?: string;
  enabled?: boolean;
  limit?: number;
  offset?: number;
}

export async function listChains(
  db: Database,
  opts: ListChainsOptions = {},
): Promise<{ chains: ChainWithMetrics[]; total: number }> {
  const {
    sort = "name",
    order = sort === "name" ? "asc" : "desc",
    vmType,
    category,
    search,
    enabled = true,
    limit = 50,
    offset = 0,
  } = opts;

  // Build WHERE conditions
  const conditions = [];
  if (enabled !== undefined) conditions.push(eq(chains.enabled, enabled));
  if (vmType && vmType !== "all") conditions.push(eq(chains.vmType, vmType));
  if (category) conditions.push(eq(chains.category, category));
  if (search) conditions.push(ilike(chains.name, `%${search}%`));

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  // Get today's date for metrics join
  const today = new Date().toISOString().split("T")[0];

  // Main query with LEFT JOIN to latest metrics
  const rows = await db
    .select({
      chain: chains,
      metric: chainMetrics,
    })
    .from(chains)
    .leftJoin(
      chainMetrics,
      and(
        eq(chains.id, chainMetrics.chainId),
        eq(chainMetrics.date, today),
      ),
    )
    .where(where)
    .orderBy(
      sort === "tvl"
        ? order === "desc"
          ? desc(sql`COALESCE(${chainMetrics.tvlUsd}, 0)`)
          : asc(sql`COALESCE(${chainMetrics.tvlUsd}, 0)`)
        : sort === "validators"
          ? order === "desc"
            ? desc(sql`COALESCE(${chainMetrics.validatorCount}, 0)`)
            : asc(sql`COALESCE(${chainMetrics.validatorCount}, 0)`)
          : sort === "daily_txs"
            ? order === "desc"
              ? desc(sql`COALESCE(${chainMetrics.estimatedDailyTxs}, 0)`)
              : asc(sql`COALESCE(${chainMetrics.estimatedDailyTxs}, 0)`)
            : order === "desc"
              ? desc(chains.name)
              : asc(chains.name),
    )
    .limit(limit)
    .offset(offset);

  // Count total
  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(chains)
    .where(where);

  const total = Number(countResult[0]?.count ?? 0);

  const result: ChainWithMetrics[] = rows.map((row) => ({
    ...row.chain,
    latestMetrics: row.metric
      ? {
        date: row.metric.date,
        validatorCount: row.metric.validatorCount,
        totalStakeWeight: row.metric.totalStakeWeight,
        tvlUsd: row.metric.tvlUsd,
        latestBlockNumber: row.metric.latestBlockNumber,
        recentTxCount: row.metric.recentTxCount,
        avgGasPrice: row.metric.avgGasPrice,
        avgBlockTime: row.metric.avgBlockTime,
        estimatedDailyTxs: row.metric.estimatedDailyTxs,
      }
      : null,
  }));

  return { chains: result, total };
}

export async function getChainBySlug(
  db: Database,
  slug: string,
): Promise<
  (ChainWithMetrics & { validators: { nodeId: string; weight: number | null }[] }) | null
> {
  const today = new Date().toISOString().split("T")[0];

  const rows = await db
    .select({
      chain: chains,
      metric: chainMetrics,
    })
    .from(chains)
    .leftJoin(
      chainMetrics,
      and(eq(chains.id, chainMetrics.chainId), eq(chainMetrics.date, today)),
    )
    .where(eq(chains.slug, slug))
    .limit(1);

  if (rows.length === 0) return null;

  const row = rows[0];

  // Get validators
  const validators = await db
    .select({
      nodeId: chainValidators.nodeId,
      weight: chainValidators.weight,
    })
    .from(chainValidators)
    .where(eq(chainValidators.chainId, row.chain.id))
    .orderBy(desc(chainValidators.weight));

  return {
    ...row.chain,
    latestMetrics: row.metric
      ? {
        date: row.metric.date,
        validatorCount: row.metric.validatorCount,
        totalStakeWeight: row.metric.totalStakeWeight,
        tvlUsd: row.metric.tvlUsd,
        latestBlockNumber: row.metric.latestBlockNumber,
        recentTxCount: row.metric.recentTxCount,
        avgGasPrice: row.metric.avgGasPrice,
        avgBlockTime: row.metric.avgBlockTime,
        estimatedDailyTxs: row.metric.estimatedDailyTxs,
      }
      : null,
    validators,
  };
}
