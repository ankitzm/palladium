import { Hono } from "hono";
import { listProtocols } from "../services/queries/protocols.js";
import type { Database } from "@palladium/shared/db";

export function protocolsRoutes(db: Database) {
  const app = new Hono();

  // GET /api/protocols?chain=beam | ?chainKey=Avalanche | &limit=
  app.get("/", async (c) => {
    const q = c.req.query();
    const limit = Math.min(parseInt(q.limit ?? "50"), 200);
    const result = await listProtocols(db, {
      chainSlug: q.chain || undefined,
      chainKey: q.chainKey || undefined,
      limit,
    });
    return c.json({ ...result, limit });
  });

  return app;
}
