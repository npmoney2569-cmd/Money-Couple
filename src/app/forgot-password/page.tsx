"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin;
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${appUrl}/auth/reset-password`,
    });

    setLoading(false);
    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("ส่งลิงก์รีเซ็ตรหัสผ่านแล้ว กรุณาตรวจสอบอีเมล");
  }

  return (
    <main style={{ display: "grid", placeItems: "center", padding: "48px 20px" }}>
      <section
        style={{
          width: "min(460px, 100%)",
          background: "var(--card)",
          borderRadius: 20,
          padding: 24,
          border: "1px solid #dce8de",
        }}
      >
        <h1 style={{ marginTop: 0 }}>ลืมรหัสผ่าน</h1>
        <p>กรอกอีเมลเพื่อรับลิงก์สำหรับตั้งรหัสผ่านใหม่</p>

        <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
          <label style={{ display: "grid", gap: 6 }}>
            <span>Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{ border: "1px solid #c6d9cc", borderRadius: 10, padding: "10px 12px" }}
            />
          </label>
          <button
            type="submit"
            disabled={loading}
            style={{
              background: "var(--accent)",
              color: "#fff",
              border: "none",
              borderRadius: 10,
              padding: "12px 14px",
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "กำลังส่ง..." : "ส่งลิงก์รีเซ็ตรหัสผ่าน"}
          </button>
        </form>

        {message ? <p>{message}</p> : null}
        <p>
          <Link href="/login">กลับไปหน้าเข้าสู่ระบบ</Link>
        </p>
      </section>
    </main>
  );
}
