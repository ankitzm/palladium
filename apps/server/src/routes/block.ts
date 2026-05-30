import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { chains } from "@palladium/shared/db/schema";
import { fetchBlockNumber } from "../clients/evm-rpc.js";
import type { Database } from "@palladium/shared/db";

// Server-side proxy for the live block-height ticker. Subnet RPCs don't send CORS
// headers, so the browser can't poll them directly — it polls this instead.
export function blockRoutes(db: Database) {
  const app = new Hono();

  // GET /api/block-height?slug=beam
  app.get("/", async (c) => {
    const slug = c.req.query("slug");
    if (!slug) return c.json({ error: "slug required" }, 400);

    const [chain] = await db
      .select({ rpcUrl: chains.rpcUrl })
      .from(chains)
      .where(eq(chains.slug, slug))
      .limit(1);

    if (!chain?.rpcUrl) {
      return c.json({ error: "no RPC for chain" }, 404);
    }

    try {
      // fetchBlockNumber already parses the hex result into a number.
      const blockNumber = await fetchBlockNumber(chain.rpcUrl);
      return c.json({ slug, blockNumber });
    } catch {
      return c.json({ error: "rpc unreachable" }, 502);
    }
  });

  return app;
}
