import "dotenv/config";
import { createDb } from "@palladium/shared/db";
import { chains } from "@palladium/shared/db/schema";
import { eq, inArray, ilike } from "drizzle-orm";

const db = createDb(process.env.DATABASE_URL as string);

async function main() {
  // Check known chains by name
  const known = await db
    .select({
      id: chains.id,
      name: chains.name,
      blockchainId: chains.blockchainId,
      vmId: chains.vmId,
      isEvm: chains.isEvm,
      vmType: chains.vmType,
      isFeatured: chains.isFeatured,
      rpcUrl: chains.rpcUrl,
      evmChainId: chains.evmChainId,
    })
    .from(chains)
    .where(
      inArray(chains.name, [
        "DFK Chain",
        "Beam",
        "beam",
        "Dexalot",
        "dexalotevm",
        "dexalotmain",
        "Swimmer",
        "Swimmer Network",
      ]),
    );

  console.log(`Found ${known.length} known chains:`);
  for (const c of known) {
    console.log(`\n  Name: ${c.name}`);
    console.log(`  blockchainId: ${c.blockchainId}`);
    console.log(`  vmId: ${c.vmId.slice(0, 20)}...`);
    console.log(`  vmType: ${c.vmType}, isEvm: ${c.isEvm}, isFeatured: ${c.isFeatured}`);
    console.log(`  evmChainId: ${c.evmChainId}`);
    console.log(`  rpcUrl: ${c.rpcUrl}`);
  }
}

main().catch(console.error);
