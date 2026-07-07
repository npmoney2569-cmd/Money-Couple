import { config as loadEnv } from "dotenv";
import { Client } from "pg";

loadEnv({ path: ".env.local" });

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!connectionString) {
  console.error("Missing DIRECT_URL or DATABASE_URL in .env.local");
  process.exit(1);
}

const query = `
  with u as (
    select id from public.users where email = 'admin@cmn.local' limit 1
  )
  select
    (select count(*) from public.accounts a join u on a.user_id = u.id) as accounts,
    (select count(*) from public.transactions t join u on t.user_id = u.id) as transactions,
    (select count(*) from public.transaction_splits s join public.transactions t on t.id = s.transaction_id join u on t.user_id = u.id) as splits,
    (select count(*) from public.budgets b join u on b.user_id = u.id) as budgets,
    (select count(*) from public.tags tg join u on tg.user_id = u.id) as tags,
    (select count(*) from public.goals g join u on g.user_id = u.id) as goals,
    (select count(*) from public.debts d join u on d.user_id = u.id) as debts,
    (select count(*) from public.assets a2 join u on a2.user_id = u.id) as assets;
`;

async function main() {
  const client = new Client({ connectionString });
  await client.connect();
  try {
    const result = await client.query(query);
    console.log(result.rows[0]);
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
