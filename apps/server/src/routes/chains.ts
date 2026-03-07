import { Hono } from "hono";
import { listChains, getChainBySlug } from "../services/queries/chains.js";
import type { Database } from "@palladium/shared/db";

export function chainsRoutes(db: Database) {
  const app = new Hono();

  // GET /api/chains
  app.get("/", async (c) => {
    const query = c.req.query();

    const result = await listChains(db, {
      sort: (query.sort as "name" | "tvl" | "validators" | "daily_txs") ?? "name",
      order: (query.order as "asc" | "desc") ?? undefined,
      vmType: query.vm_type,
      category: query.category,
      search: query.search,
      enabled: query.enabled === "false" ? false : true,
      limit: Math.min(parseInt(query.limit ?? "50"), 500),
      offset: parseInt(query.offset ?? "0"),
    });

    return c.json(result);
  });

  // GET /api/chains/:slug
  app.get("/:slug", async (c) => {
    const slug = c.req.param("slug");
    const chain = await getChainBySlug(db, slug);

    if (!chain) {
      return c.json({ error: "Chain not found" }, 404);
    }

    return c.json({ chain });
  });

  return app;
}
