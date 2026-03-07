/**
 * Enable or disable a chain by slug.
 *
 * Usage:
 *   pnpm --filter @palladium/server exec tsx ../../scripts/toggle-chain.ts --slug some-chain --enabled false
 *   pnpm --filter @palladium/server exec tsx ../../scripts/toggle-chain.ts --slug some-chain --enabled true
 */
import "dotenv/config";
import { eq } from "drizzle-orm";
import { createDb } from "@palladium/shared/db";
import { chains } from "@palladium/shared/db/schema";

const args = process.argv.slice(2);
function getArg(name: string): string | undefined {
  const idx = args.indexOf(`--${name}`);
  return idx !== -1 ? args[idx + 1] : undefined;
}

const slugArg = getArg("slug");
const enabledArg = getArg("enabled");

if (!slugArg || !enabledArg) {
  console.error("Usage: --slug <chain-slug> --enabled true|false");
  process.exit(1);
}

const enabled = enabledArg === "true";

async function main() {
  const db = createDb(process.env.DATABASE_URL!);

  const [chain] = await db
    .select({ id: chains.id, name: chains.name, enabled: chains.enabled })
    .from(chains)
    .where(eq(chains.slug, slugArg!));

  if (!chain) {
    console.error(`Chain not found: ${slugArg}`);
    process.exit(1);
  }

  if (chain.enabled === enabled) {
    console.log(`${chain.name} is already ${enabled ? "enabled" : "disabled"}.`);
    return;
  }

  await db
    .update(chains)
    .set({ enabled, updatedAt: new Date() })
    .where(eq(chains.id, chain.id));

  console.log(`${chain.name}: ${chain.enabled ? "enabled" : "disabled"} -> ${enabled ? "enabled" : "disabled"}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
