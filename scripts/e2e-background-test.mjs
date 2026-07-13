import { createClient } from '@supabase/supabase-js';
import { config as loadEnv } from 'dotenv';
import { Client } from 'pg';

loadEnv({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
  console.error("Missing environment variables");
  process.exit(1);
}

const adminAuthClient = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

function getClientUserClient() {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

async function runTests() {
  console.log("Starting Background E2E Tests...");
  let user1Id, user2Id;

  try {
    // 0. Pre-cleanup
    console.log("0. Cleaning up old test users if they exist...");
    const { data: usersData } = await adminAuthClient.auth.admin.listUsers();
    for (const u of (usersData?.users || [])) {
      if (u.email === 'test1_e2e@cmn.local' || u.email === 'test2_e2e@cmn.local') {
        await adminAuthClient.auth.admin.deleteUser(u.id);
        
        // Also ensure they are removed from public.users manually if triggers fail
        const pgClient = new Client({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL });
        await pgClient.connect();
        await pgClient.query(`DELETE FROM public.users WHERE email = $1`, [u.email]);
        await pgClient.end();
      }
    }

    // 1. Create Test Users (admin)
    console.log("1. Creating Test Users...");
    const { data: u1, error: e1 } = await adminAuthClient.auth.admin.createUser({
      email: 'test1_e2e@cmn.local',
      password: 'password123',
      email_confirm: true,
      user_metadata: { username: 'test1_e2e' }
    });
    if (e1) throw new Error("Failed to create User 1: " + e1.message);
    user1Id = u1.user.id;

    const { data: u2, error: e2 } = await adminAuthClient.auth.admin.createUser({
      email: 'test2_e2e@cmn.local',
      password: 'password123',
      email_confirm: true,
      user_metadata: { username: 'test2_e2e' }
    });
    if (e2) throw new Error("Failed to create User 2: " + e2.message);
    user2Id = u2.user.id;
    console.log(`✅ Users created: ${user1Id}, ${user2Id}`);

    // Wait for the auth trigger to create public.users
    await new Promise(r => setTimeout(r, 1000));

    // 2. Login as User 1
    const client1 = getClientUserClient();
    await client1.auth.signInWithPassword({ email: 'test1_e2e@cmn.local', password: 'password123' });

    // 3. Test Core Functions (Create Account, Category, Transaction)
    console.log("2. Testing Core CRUD & Triggers...");
    
    // Create Account
    const { data: account, error: accErr } = await client1.from('accounts')
      .insert({ name: 'Test Bank', type: 'bank', balance: 5000, user_id: user1Id })
      .select().single();
    if (accErr) throw new Error("Create Account Failed: " + accErr.message);

    // Create Category
    const { data: category, error: catErr } = await client1.from('categories')
      .insert({ name: 'Test Food', type: 'expense', user_id: user1Id })
      .select().single();
    if (catErr) throw new Error("Create Category Failed: " + catErr.message);

    // Create Transaction
    const { data: tx, error: txErr } = await client1.from('transactions')
      .insert({
        user_id: user1Id,
        account_id: account.id,
        category_id: category.id,
        amount: 500,
        type: 'expense',
        date: new Date().toISOString().split('T')[0],
        note: 'E2E Test Lunch'
      }).select().single();
    if (txErr) throw new Error("Create Transaction Failed: " + txErr.message);

    // Verify Balance Trigger (should be 5000 - 500 = 4500)
    const { data: accCheck1 } = await client1.from('accounts').select('balance').eq('id', account.id).single();
    if (accCheck1.balance !== 4500) throw new Error(`Balance not updated! Expected 4500, got ${accCheck1.balance}`);
    
    // Soft Delete Transaction
    console.log("3. Testing Soft Delete...");
    const { error: delErr } = await client1.from('transactions')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', tx.id);
    if (delErr) throw new Error("Soft Delete Failed: " + delErr.message);

    // Verify Balance Restored (should be 5000)
    const { data: accCheck2 } = await client1.from('accounts').select('balance').eq('id', account.id).single();
    if (accCheck2.balance !== 5000) throw new Error(`Balance not restored! Expected 5000, got ${accCheck2.balance}`);
    console.log("✅ Core CRUD, Triggers, and Soft Delete are working perfectly.");

    // 4. Test Couple Connection (User 1 invites User 2)
    console.log("4. Testing Couple Features...");
    const client2 = getClientUserClient();
    await client2.auth.signInWithPassword({ email: 'test2_e2e@cmn.local', password: 'password123' });

    // Create Couple Connection via Admin
    const { data: couple, error: coupleErr } = await adminAuthClient.from('couples')
      .insert({ name: 'E2E Test Couple' })
      .select().single();
    if (coupleErr) throw new Error("Couple Creation Failed: " + coupleErr.message);

    // Add members to couple
    const { error: cmErr1 } = await adminAuthClient.from('couple_members')
      .insert({ couple_id: couple.id, user_id: user1Id, role: 'owner', permission: 'edit' });
    if (cmErr1) throw new Error("Couple Member 1 Failed: " + cmErr1.message);

    const { error: cmErr2 } = await adminAuthClient.from('couple_members')
      .insert({ couple_id: couple.id, user_id: user2Id, role: 'member', permission: 'edit' });
    if (cmErr2) throw new Error("Couple Member 2 Failed: " + cmErr2.message);
    
    console.log("✅ Couple connection established.");

  } catch (error) {
    console.error("❌ Test Failed:", error.message);
  } finally {
    // 5. Cleanup
    console.log("5. Cleaning up test users...");
    if (user1Id) await adminAuthClient.auth.admin.deleteUser(user1Id);
    if (user2Id) await adminAuthClient.auth.admin.deleteUser(user2Id);
    
    try {
      const pgClient = new Client({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL });
      await pgClient.connect();
      await pgClient.query(`DELETE FROM public.users WHERE email IN ('test1_e2e@cmn.local', 'test2_e2e@cmn.local')`);
      await pgClient.end();
    } catch (e) {
      console.error("Cleanup warning:", e.message);
    }
    
    console.log("✅ Test cleanup complete.");
  }
}

runTests();
