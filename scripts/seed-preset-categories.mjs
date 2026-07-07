import { createClient } from "@supabase/supabase-js";
import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing Supabase env vars in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const presets = [
  { name: "เงินเดือน", type: "income", color: "#34d399", sort_order: 10 },
  { name: "รายได้อื่น", type: "income", color: "#60a5fa", sort_order: 20 },
  { name: "เงินปันผล", type: "income", color: "#fbbf24", sort_order: 30 },
  { name: "ขายของ", type: "income", color: "#a78bfa", sort_order: 40 },
  { name: "อาหารและเครื่องดื่ม", type: "expense", color: "#f87171", sort_order: 10 },
  { name: "ค่าเดินทาง", type: "expense", color: "#38bdf8", sort_order: 20 },
  { name: "ค่าที่พัก", type: "expense", color: "#f97316", sort_order: 30 },
  { name: "ค่าสาธารณูปโภค", type: "expense", color: "#fbbf24", sort_order: 40 },
  { name: "ช้อปปิ้ง", type: "expense", color: "#a855f7", sort_order: 50 },
  { name: "สุขภาพและความงาม", type: "expense", color: "#14b8a6", sort_order: 60 },
  { name: "บันเทิง", type: "expense", color: "#fb7185", sort_order: 70 },
  { name: "การศึกษา", type: "expense", color: "#7c3aed", sort_order: 80 },
  { name: "ของขวัญและบริจาค", type: "expense", color: "#f59e0b", sort_order: 90 },
  { name: "อื่นๆ", type: "expense", color: "#64748b", sort_order: 100 },
];

async function seedCategories() {
  console.log("Seeding preset categories...");

  for (const item of presets) {
    const { data, error } = await supabase
      .from("categories")
      .select("id")
      .eq("name", item.name)
      .eq("type", item.type)
      .eq("is_preset", true)
      .limit(1)
      .single();

    if (error && error.code !== "PGRST116") {
      console.error("Failed to query category:", error.message);
      process.exit(1);
    }

    if (data) {
      console.log(`Preset category exists: ${item.type} / ${item.name}`);
      continue;
    }

    const { error: insertError } = await supabase.from("categories").insert([
      {
        name: item.name,
        type: item.type,
        is_preset: true,
        color: item.color,
        sort_order: item.sort_order,
      },
    ]);

    if (insertError) {
      console.error(`Failed to insert category ${item.name}:`, insertError.message);
      process.exit(1);
    }

    console.log(`Inserted preset category: ${item.type} / ${item.name}`);
  }

  console.log("Preset category seeding completed.");
}

seedCategories().catch((error) => {
  console.error("Unexpected error seeding categories:", error);
  process.exit(1);
});
