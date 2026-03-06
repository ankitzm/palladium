import { Hono } from "hono";
import { runAllIngestion } from "../services/ingestion/run-all.js";
import type { Database } from "@palladium/shared/db";

export function ingestRoutes(db: Database) {
  const app = new Hono();

  app.post("/", async (c) => {
    // Verify cron secret
    const authHeader = c.req.header("authorization");
    const secret = process.env.CRON_SECRET;

    if (secret && authHeader !== `Bearer ${secret}`) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const results = await runAllIngestion(db);

    return c.json({
      status: results.every((r) => r.status === "success") ? "success" : "partial",
      jobs: results,
    });
  });

  return app;
}
