import { ingestionLog } from "@palladium/shared/db/schema";
import { discoverChains } from "./discover-chains.js";
import { fetchValidators } from "./fetch-validators.js";
import { fetchTvl } from "./fetch-tvl.js";
import { fetchEvmMetrics } from "./fetch-evm-metrics.js";
import type { Database } from "@palladium/shared/db";

interface JobResult {
  name: string;
  status: "success" | "error";
  chainsProcessed: number;
  durationMs: number;
  error?: string;
}

async function runJob(
  db: Database,
  name: string,
  fn: (db: Database) => Promise<number>,
): Promise<JobResult> {
  const start = Date.now();
  console.log(`\n=== Starting ${name} ===`);

  try {
    const processed = await fn(db);
    const durationMs = Date.now() - start;

    await db.insert(ingestionLog).values({
      jobName: name,
      status: "success",
      chainsProcessed: processed,
      durationMs,
      completedAt: new Date(),
    });

    console.log(`=== ${name} completed in ${durationMs}ms (${processed} chains) ===`);
    return { name, status: "success", chainsProcessed: processed, durationMs };
  } catch (err) {
    const durationMs = Date.now() - start;
    const errorMsg = err instanceof Error ? err.message : String(err);

    await db.insert(ingestionLog).values({
      jobName: name,
      status: "error",
      chainsProcessed: 0,
      errorMessage: errorMsg,
      durationMs,
      completedAt: new Date(),
    });

    console.error(`=== ${name} FAILED in ${durationMs}ms: ${errorMsg} ===`);
    return { name, status: "error", chainsProcessed: 0, durationMs, error: errorMsg };
  }
}

export async function runAllIngestion(db: Database): Promise<JobResult[]> {
  console.log("\n🔄 Starting full ingestion pipeline...\n");
  const overallStart = Date.now();

  const results: JobResult[] = [];

  // Sequential: each step depends on the previous
  results.push(await runJob(db, "discover-chains", discoverChains));
  results.push(await runJob(db, "fetch-validators", fetchValidators));
  results.push(await runJob(db, "fetch-tvl", fetchTvl));
  results.push(await runJob(db, "fetch-evm-metrics", fetchEvmMetrics));

  const totalMs = Date.now() - overallStart;
  console.log(`\n✅ Full ingestion completed in ${totalMs}ms`);
  console.log(
    results
      .map((r) => `  ${r.status === "success" ? "✓" : "✗"} ${r.name}: ${r.chainsProcessed} chains (${r.durationMs}ms)`)
      .join("\n"),
  );

  return results;
}
