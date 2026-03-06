import { Hono } from "hono";
import { getMetricsHistory } from "../services/queries/metrics.js";
import type { Database } from "@palladium/shared/db";

export function metricsRoutes(db: Database) {
  const app = new Hono();

  // GET /api/chains/:slug/metrics
  app.get("/:slug/metrics", async (c) => {
    const slug = c.req.param("slug");
    const days = Math.min(parseInt(c.req.query("days") ?? "30"), 90);

    const result = await getMetricsHistory(db, slug, days);

    if (!result) {
      return c.json({ error: "Chain not found" }, 404);
    }

    return c.json(result);
  });

  return app;
}
