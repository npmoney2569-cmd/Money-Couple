import { config as loadEnv } from "dotenv";
import { readFile } from "node:fs/promises";
import { Client } from "pg";

loadEnv({ path: ".env.local" });

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!connectionString) {
  console.error("Missing DIRECT_URL or DATABASE_URL in .env.local");
  process.exit(1);
}

async function runSqlFile(client, filePath) {
  const sql = await readFile(filePath, "utf8");
  console.log(`Applying ${filePath} ...`);
  await client.query(sql);
  console.log(`Applied ${filePath}`);
}

async function main() {
  const client = new Client({ connectionString });
  await client.connect();

  try {
    await runSqlFile(client, "scripts/schema.sql");
    await runSqlFile(client, "scripts/triggers.sql");
    console.log("Database schema and triggers applied successfully.");
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error("Failed to apply SQL:", error.message);
  process.exit(1);
});
