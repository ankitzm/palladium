import { Hono } from "hono";
import { and, eq, sql, desc, lt } from "drizzle-orm";
import { chains, chainMetrics, ingestionLog } from "@palladium/shared/db/schema";
import { listChains, getChainBySlug } from "../services/queries/chains.js";
import type { Database } from "@palladium/shared/db";

interface DateTotals {
  tvl: number;
  validators: number;
  txns: number;
}

// Aggregate TVL / validators / daily-txns for a single metrics date.
async function totalsForDate(db: Database, date: string): Promise<DateTotals> {
  const [row] = await db
    .select({
      tvl: sql<number>`coalesce(sum(${chainMetrics.tvlUsd}), 0)`,
      validators: sql<number>`coalesce(sum(${chainMetrics.validatorCount}), 0)`,
      txns: sql<number>`coalesce(sum(coalesce(${chainMetrics.actualDailyTxs}, ${chainMetrics.estimatedDailyTxs}, 0)), 0)`,
    })
    .from(chainMetrics)
    .where(eq(chainMetrics.date, date));
  return {
    tvl: Number(row?.tvl ?? 0),
    validators: Number(row?.validators ?? 0),
    txns: Number(row?.txns ?? 0),
  };
}

function pct(curr: number, prev: number): number | null {
  if (!prev) return null;
  return ((curr - prev) / prev) * 100;
}

function shiftDate(date: string, days: number): string {
  const ms = new Date(`${date}T00:00:00Z`).getTime() - days * 86400000;
  return new Date(ms).toISOString().slice(0, 10);
}

export function overviewRoutes(db: Database) {
  const app = new Hono();

  app.get("/", async (c) => {
    // Chain-level counts (date-independent).
    const [stats] = await db
      .select({
        totalChains: sql<number>`count(*)`,
        totalSubnets: sql<number>`count(distinct ${chains.subnetId})`,
        evmChains: sql<number>`count(*) filter (where ${chains.isEvm} = true)`,
        enabledChains: sql<number>`count(*) filter (where ${chains.enabled} = true)`,
      })
      .from(chains);

    // Resolve the most recent metrics date we actually have. After UTC midnight
    // today's ingestion may not have run, so headline numbers come from here.
    const [latest] = await db
      .select({ date: sql<string | null>`max(${chainMetrics.date})` })
      .from(chainMetrics);
    const asOfDate = latest?.date ?? null;

    // Previous metrics date (for day-over-day deltas).
    let prevDate: string | null = null;
    if (asOfDate) {
      const [prev] = await db
        .select({ date: sql<string | null>`max(${chainMetrics.date})` })
        .from(chainMetrics)
        .where(lt(chainMetrics.date, asOfDate));
      prevDate = prev?.date ?? null;
    }

    const curr = asOfDate
      ? await totalsForDate(db, asOfDate)
      : { tvl: 0, validators: 0, txns: 0 };

    // Only treat the previous date as a day-over-day baseline when it is exactly
    // one day before asOfDate. Comparing non-adjacent dates (sparse ingestion)
    // would mislabel a multi-day swing as a "24h" change — "honest by default".
    const adjacent =
      asOfDate != null && prevDate != null && prevDate === shiftDate(asOfDate, 1);
    const prev = adjacent ? await totalsForDate(db, prevDate!) : null;

    // Leaderboards (listChains is keyed on today's date internally).
    const topByTvl = await listChains(db, { sort: "tvl", order: "desc", limit: 10 });
    const topByTxs = await listChains(db, { sort: "daily_txs", order: "desc", limit: 10 });

    // Spotlight: chain with the highest positive 7-day TVL growth, else top TVL.
    let spotlightSlug: string | null = topByTvl.chains[0]?.slug ?? null;
    if (asOfDate) {
      const sevenAgo = shiftDate(asOfDate, 7);
      const currTvl = await db
        .select({ slug: chains.slug, tvl: chainMetrics.tvlUsd })
        .from(chainMetrics)
        .innerJoin(chains, eq(chainMetrics.chainId, chains.id))
        .where(and(eq(chainMetrics.date, asOfDate), eq(chains.enabled, true)));
      const pastTvl = await db
        .select({ slug: chains.slug, tvl: chainMetrics.tvlUsd })
        .from(chainMetrics)
        .innerJoin(chains, eq(chainMetrics.chainId, chains.id))
        .where(eq(chainMetrics.date, sevenAgo));
      const pastMap = new Map(pastTvl.map((r) => [r.slug, r.tvl ?? 0]));
      let best = 0; // require strictly positive growth to override top-TVL
      for (const r of currTvl) {
        const past = pastMap.get(r.slug);
        if (!past || !r.tvl) continue;
        const growth = (r.tvl - past) / past;
        if (growth > best) {
          best = growth;
          spotlightSlug = r.slug;
        }
      }
    }

    // Resolve the spotlight to a full chain object so the client always has it
    // (it may fall outside the top-10 TVL leaderboard).
    const spotlightChain = spotlightSlug
      ? await getChainBySlug(db, spotlightSlug).catch(() => null)
      : null;

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
      totalTvlUsd: curr.tvl,
      totalValidators: curr.validators,
      total24hTxns: curr.txns,
      tvlChangePct: prev ? pct(curr.tvl, prev.tvl) : null,
      validatorsChangePct: prev ? pct(curr.validators, prev.validators) : null,
      txnsChangePct: prev ? pct(curr.txns, prev.txns) : null,
      asOfDate,
      spotlightSlug,
      spotlightChain,
      topChainsByTvl: topByTvl.chains,
      topChainsByTxs: topByTxs.chains,
      lastIngestionAt: lastIngestion?.completedAt?.toISOString() ?? null,
    });
  });

  return app;
}
