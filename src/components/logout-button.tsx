"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LogoutButton() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);

  async function onLogout() {
    setLoading(true);
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      onClick={onLogout}
      disabled={loading}
      style={{
        border: "1px solid rgba(157, 185, 255, 0.36)",
        background: "rgba(38, 73, 145, 0.32)",
        color: "#e8f1ff",
        borderRadius: 10,
        padding: "10px 12px",
        cursor: loading ? "not-allowed" : "pointer",
      }}
    >
      {loading ? "กำลังออกจากระบบ..." : "ออกจากระบบ"}
    </button>
  );
}
