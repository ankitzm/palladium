import { Hono } from "hono";
import { eq, sql, desc, and } from "drizzle-orm";
import { chains, chainMetrics, ingestionLog } from "@palladium/shared/db/schema";
import { listChains } from "../services/queries/chains.js";
import type { Database } from "@palladium/shared/db";

export function overviewRoutes(db: Database) {
  const app = new Hono();

  app.get("/", async (c) => {
    const today = new Date().toISOString().split("T")[0];

    // Aggregate stats
    const [stats] = await db
      .select({
        totalChains: sql<number>`count(*)`,
        totalSubnets: sql<number>`count(distinct ${chains.subnetId})`,
        evmChains: sql<number>`count(*) filter (where ${chains.isEvm} = true)`,
        enabledChains: sql<number>`count(*) filter (where ${chains.enabled} = true)`,
      })
      .from(chains);

    // Total TVL
    const [tvlResult] = await db
      .select({
        totalTvl: sql<number>`coalesce(sum(${chainMetrics.tvlUsd}), 0)`,
      })
      .from(chainMetrics)
      .where(eq(chainMetrics.date, today));

    // Top chains by TVL
    const topByTvl = await listChains(db, {
      sort: "tvl",
      order: "desc",
      limit: 10,
    });

    // Top chains by daily txs
    const topByTxs = await listChains(db, {
      sort: "daily_txs",
      order: "desc",
      limit: 10,
    });

    // Last ingestion timestamp
    const [lastIngestion] = await db
      .select({ completedAt: ingestionLog.completedAt })
      .from(ingestionLog)
      .where(eq(ingestionLog.status, "success"))
      .orderBy(desc(ingestionLog.completedAt))
      .limit(1);

    return c.json({
      totalChains: Number(stats.totalChains),
      totalSubnets: Number(stats.totalSubnets),
      evmChains: Number(stats.evmChains),
      enabledChains: Number(stats.enabledChains),
      totalTvlUsd: Number(tvlResult.totalTvl),
      topChainsByTvl: topByTvl.chains,
      topChainsByTxs: topByTxs.chains,
      lastIngestionAt: lastIngestion?.completedAt?.toISOString() ?? null,
    });
  });

  return app;
}
