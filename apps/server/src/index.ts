import "dotenv/config";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { createDb } from "@palladium/shared/db";
import { chainsRoutes } from "./routes/chains.js";
import { metricsRoutes } from "./routes/metrics.js";
import { overviewRoutes } from "./routes/overview.js";
import { ingestRoutes } from "./routes/ingest.js";
import { blockRoutes } from "./routes/block.js";
import { validatorsRoutes } from "./routes/validators.js";

const db = createDb(process.env.DATABASE_URL!);

const app = new Hono();

// Middleware
app.use("*", logger());
app.use(
  "*",
  cors({
    origin: "*",
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
  }),
);

// Health check
app.get("/health", (c) => c.json({ status: "ok", timestamp: new Date().toISOString() }));

// API routes
app.route("/api/chains", chainsRoutes(db));
app.route("/api/chains", metricsRoutes(db));
app.route("/api/overview", overviewRoutes(db));
app.route("/api/ingest", ingestRoutes(db));
app.route("/api/block-height", blockRoutes(db));
app.route("/api/validators", validatorsRoutes(db));

// Start server
const port = parseInt(process.env.PORT ?? "8787");

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`🚀 Palladium API server running on http://localhost:${info.port}`);
});
