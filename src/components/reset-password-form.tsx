"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordForm() {
  const supabase = createClient();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    if (password.length < 6) {
      setMessage("รหัสผ่านต้องยาวอย่างน้อย 6 ตัวอักษร");
      return;
    }

    if (password !== confirmPassword) {
      setMessage("รหัสผ่านใหม่และยืนยันรหัสผ่านไม่ตรงกัน");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("รีเซ็ตรหัสผ่านสำเร็จ สามารถเข้าสู่ระบบได้ทันที");
  }

  return (
    <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
      <label style={{ display: "grid", gap: 6 }}>
        <span>รหัสผ่านใหม่</span>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          style={{ border: "1px solid #c6d9cc", borderRadius: 10, padding: "10px 12px" }}
        />
      </label>

      <label style={{ display: "grid", gap: 6 }}>
        <span>ยืนยันรหัสผ่านใหม่</span>
        <input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          minLength={6}
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
        {loading ? "กำลังบันทึก..." : "บันทึกรหัสผ่านใหม่"}
      </button>

      {message ? <p style={{ margin: 0 }}>{message}</p> : null}
      <p style={{ margin: 0 }}>
        <Link href="/login">กลับไปหน้าเข้าสู่ระบบ</Link>
      </p>
    </form>
  );
}
