import "dotenv/config";
import { createDb } from "@palladium/shared/db";
import { chains, chainMetrics } from "@palladium/shared/db/schema";
import { eq } from "drizzle-orm";

async function main() {
  const db = createDb(process.env.DATABASE_URL!);
  const [c] = await db
    .select({ id: chains.id })
    .from(chains)
    .where(eq(chains.name, "mainnetl1"));
  if (c) {
    await db
      .update(chainMetrics)
      .set({ tvlUsd: null })
      .where(eq(chainMetrics.chainId, c.id));
    console.log(`Cleared TVL for mainnetl1 (id=${c.id})`);
  }
}

main().catch(console.error);
