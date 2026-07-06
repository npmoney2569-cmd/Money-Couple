import { createClient } from "@supabase/supabase-js";
import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing Supabase env vars in .env.local");
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const adminEmail = "admin@cmn.local";
const adminPassword = "admin99";

async function upsertAdminUser() {
  const { data: listData, error: listError } = await supabaseAdmin.auth.admin.listUsers();
  if (listError) {
    console.error("Failed to list users:", listError.message);
    process.exit(1);
  }

  const existing = listData.users.find((user) => user.email?.toLowerCase() === adminEmail);

  if (existing) {
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(existing.id, {
      password: adminPassword,
      user_metadata: {
        username: "admin",
        role: "admin",
      },
      app_metadata: {
        role: "admin",
      },
      email_confirm: true,
    });

    if (updateError) {
      console.error("Failed to update existing admin user:", updateError.message);
      process.exit(1);
    }

    console.log("Admin user updated successfully");
    console.log("username: admin");
    console.log("password: admin99");
    console.log("email: admin@cmn.local");
    return;
  }

  const { error: createError } = await supabaseAdmin.auth.admin.createUser({
    email: adminEmail,
    password: adminPassword,
    email_confirm: true,
    user_metadata: {
      username: "admin",
      role: "admin",
    },
    app_metadata: {
      role: "admin",
    },
  });

  if (createError) {
    console.error("Failed to create admin user:", createError.message);
    process.exit(1);
  }

  console.log("Admin user created successfully");
  console.log("username: admin");
  console.log("password: admin99");
  console.log("email: admin@cmn.local");
}

upsertAdminUser();
