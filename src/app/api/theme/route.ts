import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { theme } = await request.json();
    if (theme !== "light" && theme !== "dark" && theme !== "system") {
      return NextResponse.json({ error: "Invalid theme" }, { status: 400 });
    }

    // Update user profile
    const { error } = await supabase
      .from("users")
      .update({ theme })
      .eq("id", user.id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
