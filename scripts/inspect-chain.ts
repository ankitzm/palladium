/**
 * Print full chain info and all metric rows for debugging.
 *
 * Usage:
 *   pnpm --filter @palladium/server exec tsx ../../scripts/inspect-chain.ts --slug dfk-chain
 *   pnpm --filter @palladium/server exec tsx ../../scripts/inspect-chain.ts --id 711
 */
import "dotenv/config";
import { eq, desc } from "drizzle-orm";
import { createDb } from "@palladium/shared/db";
import { chains, chainMetrics, chainValidators } from "@palladium/shared/db/schema";

const args = process.argv.slice(2);
function getArg(name: string): string | undefined {
  const idx = args.indexOf(`--${name}`);
  return idx !== -1 ? args[idx + 1] : undefined;
}

const slugArg = getArg("slug");
const idArg = getArg("id");

if (!slugArg && !idArg) {
  console.error("Usage: --slug <chain-slug> | --id <chain-db-id>");
  process.exit(1);
}

async function main() {
  const db = createDb(process.env.DATABASE_URL!);

  const condition = slugArg
    ? eq(chains.slug, slugArg)
    : eq(chains.id, Number(idArg));

  const [chain] = await db.select().from(chains).where(condition);

  if (!chain) {
    console.error(`Chain not found: ${slugArg ?? idArg}`);
    process.exit(1);
  }

  console.log("\n=== Chain Info ===");
  console.log(JSON.stringify(chain, null, 2));

  // Metrics
  const metrics = await db
    .select()
    .from(chainMetrics)
    .where(eq(chainMetrics.chainId, chain.id))
    .orderBy(desc(chainMetrics.date))
    .limit(30);

  console.log(`\n=== Metrics (${metrics.length} rows, latest first) ===`);
  if (metrics.length === 0) {
    console.log("  No metrics found.");
  } else {
    console.log(
      "  Date       | Validators | TVL            | Daily Txs  | Gas (gwei) | Block Time | Block #",
    );
    console.log(
      "  -----------|------------|----------------|------------|------------|------------|--------",
    );
    for (const m of metrics) {
      const tvl = m.tvlUsd != null ? `$${m.tvlUsd.toLocaleString()}` : "—";
      console.log(
        `  ${m.date} | ${String(m.validatorCount ?? "—").padStart(10)} | ${tvl.padStart(14)} | ${String(m.estimatedDailyTxs ?? "—").padStart(10)} | ${String(m.avgGasPrice?.toFixed(1) ?? "—").padStart(10)} | ${String(m.avgBlockTime?.toFixed(1) ?? "—").padStart(10)}s | ${String(m.latestBlockNumber ?? "—").padStart(12)}`,
      );
    }
  }

  // Validators
  const validators = await db
    .select()
    .from(chainValidators)
    .where(eq(chainValidators.chainId, chain.id))
    .orderBy(desc(chainValidators.weight))
    .limit(20);

  console.log(`\n=== Validators (${validators.length} stored) ===`);
  if (validators.length > 0) {
    for (const v of validators) {
      console.log(`  ${v.nodeId}  weight=${v.weight ?? "—"}`);
    }
  } else {
    console.log("  No individual validators stored (only counts in metrics).");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
