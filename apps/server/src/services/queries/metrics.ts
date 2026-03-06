import { eq, and, desc, gte } from "drizzle-orm";
import { chains, chainMetrics } from "@palladium/shared/db/schema";
import type { Database } from "@palladium/shared/db";

export async function getMetricsHistory(
  db: Database,
  slug: string,
  days: number = 30,
) {
  // Get chain by slug
  const chainRows = await db
    .select({ id: chains.id, slug: chains.slug })
    .from(chains)
    .where(eq(chains.slug, slug))
    .limit(1);

  if (chainRows.length === 0) return null;

  const chain = chainRows[0];
  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - days);
  const fromDateStr = fromDate.toISOString().split("T")[0];

  const metrics = await db
    .select()
    .from(chainMetrics)
    .where(
      and(
        eq(chainMetrics.chainId, chain.id),
        gte(chainMetrics.date, fromDateStr),
      ),
    )
    .orderBy(desc(chainMetrics.date));

  return {
    chainId: chain.id,
    slug: chain.slug,
    metrics: metrics.map((m) => ({
      date: m.date,
      validatorCount: m.validatorCount,
      totalStakeWeight: m.totalStakeWeight,
      tvlUsd: m.tvlUsd,
      latestBlockNumber: m.latestBlockNumber,
      recentTxCount: m.recentTxCount,
      avgGasPrice: m.avgGasPrice,
      avgBlockTime: m.avgBlockTime,
      estimatedDailyTxs: m.estimatedDailyTxs,
    })),
  };
}
