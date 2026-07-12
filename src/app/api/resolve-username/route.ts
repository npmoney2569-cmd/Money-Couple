import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  try {
    const { username } = await request.json();

    if (!username || typeof username !== "string") {
      return NextResponse.json({ error: "invalid input" }, { status: 400 });
    }

    const normalized = username.trim().toLowerCase();
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("users")
      .select("email")
      .or(`username.eq.${normalized},email.eq.${normalized}`)
      .is("deleted_at", null)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data?.email) {
      return NextResponse.json({ email: null }, { status: 200 });
    }

    return NextResponse.json({ email: data.email }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "unknown error" }, { status: 500 });
  }
}
