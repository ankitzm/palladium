import { Hono } from "hono";
import { listValidators } from "../services/queries/validators.js";
import type { Database } from "@palladium/shared/db";

export function validatorsRoutes(db: Database) {
  const app = new Hono();

  // GET /api/validators?sort=weight|uptime&order=&limit=&offset=
  app.get("/", async (c) => {
    const query = c.req.query();
    const limit = Math.min(parseInt(query.limit ?? "100"), 200);
    const offset = parseInt(query.offset ?? "0");

    const result = await listValidators(db, {
      sort: query.sort === "uptime" ? "uptime" : "weight",
      order: query.order === "asc" ? "asc" : "desc",
      limit,
      offset,
    });

    return c.json({ ...result, limit, offset });
  });

  return app;
}
