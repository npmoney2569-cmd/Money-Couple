import { config as loadEnv } from "dotenv";
import { readFile } from "node:fs/promises";
import { Client } from "pg";

loadEnv({ path: ".env.local" });

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!connectionString) {
  console.error("Missing DIRECT_URL or DATABASE_URL in .env.local");
  process.exit(1);
}

async function main() {
  const sql = await readFile("scripts/grants.sql", "utf8");
  const client = new Client({ connectionString });
  await client.connect();
  try {
    await client.query(sql);
    console.log("Applied grants.sql successfully.");
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error("Failed to apply grants:", error.message);
  process.exit(1);
});
