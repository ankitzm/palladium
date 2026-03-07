/**
 * Delete metric rows for a chain and/or date range.
 *
 * Usage:
 *   # Delete ALL metrics for a chain
 *   pnpm --filter @palladium/server exec tsx ../../scripts/delete-metrics.ts --slug dfk-chain
 *
 *   # Delete metrics for a specific date
 *   pnpm --filter @palladium/server exec tsx ../../scripts/delete-metrics.ts --slug dfk-chain --date 2026-03-01
 *
 *   # Delete metrics for a date range
 *   pnpm --filter @palladium/server exec tsx ../../scripts/delete-metrics.ts --slug dfk-chain --from 2026-03-01 --to 2026-03-05
 *
 *   # Delete ALL chains' metrics for a single date
 *   pnpm --filter @palladium/server exec tsx ../../scripts/delete-metrics.ts --date 2026-03-01
 */
import "dotenv/config";
import { eq, and, gte, lte, sql } from "drizzle-orm";
import { createDb } from "@palladium/shared/db";
import { chains, chainMetrics } from "@palladium/shared/db/schema";

const args = process.argv.slice(2);
function getArg(name: string): string | undefined {
  const idx = args.indexOf(`--${name}`);
  return idx !== -1 ? args[idx + 1] : undefined;
}

const slugArg = getArg("slug");
const dateArg = getArg("date");
const fromArg = getArg("from");
const toArg = getArg("to");

if (!slugArg && !dateArg) {
  console.error(
    "Usage:\n" +
      "  --slug <slug>                          Delete all metrics for chain\n" +
      "  --slug <slug> --date YYYY-MM-DD        Delete one date for chain\n" +
      "  --slug <slug> --from DATE --to DATE    Delete date range for chain\n" +
      "  --date YYYY-MM-DD                      Delete all chains for that date",
  );
  process.exit(1);
}

async function main() {
  const db = createDb(process.env.DATABASE_URL!);

  // Build conditions
  const conditions = [];

  if (slugArg) {
    const [chain] = await db
      .select({ id: chains.id, name: chains.name })
      .from(chains)
      .where(eq(chains.slug, slugArg));
    if (!chain) {
      console.error(`Chain not found: ${slugArg}`);
      process.exit(1);
    }
    conditions.push(eq(chainMetrics.chainId, chain.id));
    console.log(`Target chain: ${chain.name} (id=${chain.id})`);
  }

  if (dateArg) {
    conditions.push(eq(chainMetrics.date, dateArg));
    console.log(`Target date: ${dateArg}`);
  } else if (fromArg && toArg) {
    conditions.push(gte(chainMetrics.date, fromArg));
    conditions.push(lte(chainMetrics.date, toArg));
    console.log(`Target range: ${fromArg} to ${toArg}`);
  }

  if (conditions.length === 0) {
    console.error("No conditions specified — refusing to delete all data.");
    process.exit(1);
  }

  // Count before deleting
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(chainMetrics)
    .where(and(...conditions));

  if (Number(count) === 0) {
    console.log("No matching rows found. Nothing to delete.");
    return;
  }

  console.log(`Found ${count} rows to delete.`);

  await db.delete(chainMetrics).where(and(...conditions));

  console.log(`Deleted ${count} metric rows.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
