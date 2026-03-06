import "dotenv/config";
import { createDb } from "@palladium/shared/db";
import { runAllIngestion } from "./services/ingestion/run-all.js";

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is required. Create a .env file in the project root.");
    process.exit(1);
  }

  const db = createDb(process.env.DATABASE_URL);
  const results = await runAllIngestion(db);

  const hasErrors = results.some((r) => r.status === "error");
  process.exit(hasErrors ? 1 : 0);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
