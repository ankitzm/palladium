import "dotenv/config";
import { neon } from "@neondatabase/serverless";

async function main() {
  const sql = neon(process.env.DATABASE_URL!);
  await sql("TRUNCATE TABLE chains CASCADE");
  await sql("ALTER TABLE chains ALTER COLUMN evm_chain_id TYPE bigint");
  console.log("Done: truncated chains and altered evm_chain_id to bigint");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
