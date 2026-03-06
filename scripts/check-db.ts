import "dotenv/config";
import { createDb } from "@palladium/shared/db";
import { chains } from "@palladium/shared/db/schema";
import { eq, isNotNull, sql } from "drizzle-orm";

const db = createDb(process.env.DATABASE_URL as string);

async function main() {
  // Total chains
  const [total] = await db.select({ count: sql<number>`count(*)` }).from(chains);
  console.log(`Total chains: ${total.count}`);

  // Chains with rpcUrl
  const withRpc = await db
    .select({ id: chains.id, name: chains.name, rpcUrl: chains.rpcUrl, isEvm: chains.isEvm })
    .from(chains)
    .where(isNotNull(chains.rpcUrl));
  console.log(`\nChains with rpcUrl: ${withRpc.length}`);
  for (const c of withRpc) {
    console.log(`  ${c.name} | isEvm: ${c.isEvm} | rpc: ${c.rpcUrl?.slice(0, 50)}`);
  }

  // Featured chains
  const featured = await db
    .select({ id: chains.id, name: chains.name, blockchainId: chains.blockchainId })
    .from(chains)
    .where(eq(chains.isFeatured, true));
  console.log(`\nFeatured chains: ${featured.length}`);
  for (const c of featured) {
    console.log(`  ${c.name} | blockchainId: ${c.blockchainId.slice(0, 25)}...`);
  }

  // EVM chains count
  const [evmCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(chains)
    .where(eq(chains.isEvm, true));
  console.log(`\nEVM chains: ${evmCount.count}`);
}

main().catch(console.error);
