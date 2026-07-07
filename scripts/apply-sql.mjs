import { config as loadEnv } from "dotenv";
import { readFile } from "node:fs/promises";
import { Client } from "pg";

const sqlFile = process.argv[2];
if (!sqlFile) {
  console.error("Usage: node scripts/apply-sql.mjs <sql-file>");
  process.exit(1);
}

loadEnv({ path: ".env.local" });

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!connectionString) {
  console.error("Missing DIRECT_URL or DATABASE_URL in .env.local");
  process.exit(1);
}

async function main() {
  const sql = await readFile(sqlFile, "utf8");
  const client = new Client({ connectionString });
  await client.connect();
  try {
    await client.query(sql);
    console.log(`Applied ${sqlFile} successfully.`);
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(`Failed to apply ${sqlFile}:`, error.message);
  process.exit(1);
});
