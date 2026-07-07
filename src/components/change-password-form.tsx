"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function ChangePasswordForm() {
  const supabase = createClient();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password !== confirmPassword) {
      setStatus("รหัสผ่านไม่ตรงกัน");
      return;
    }

    setLoading(true);
    setStatus(null);

    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      setStatus(`ไม่สามารถเปลี่ยนรหัสผ่านได้: ${error.message}`);
      return;
    }

    setStatus("เปลี่ยนรหัสผ่านเรียบร้อยแล้ว");
    setPassword("");
    setConfirmPassword("");
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "grid", gap: 12 }}>
      <h2>เปลี่ยนรหัสผ่าน</h2>

      <label style={{ display: "grid", gap: 6 }}>
        <span>รหัสผ่านใหม่</span>
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          minLength={6}
          required
          placeholder="รหัสผ่านใหม่"
          style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #c6d9cc" }}
        />
      </label>

      <label style={{ display: "grid", gap: 6 }}>
        <span>ยืนยันรหัสผ่าน</span>
        <input
          type="password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          minLength={6}
          required
          placeholder="ยืนยันรหัสผ่าน"
          style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #c6d9cc" }}
        />
      </label>

      <button
        type="submit"
        disabled={loading}
        style={{ padding: "12px 14px", borderRadius: 10, border: "none", background: "#2ee3a8", color: "#06213c", cursor: "pointer" }}
      >
        {loading ? "กำลังบันทึก..." : "เปลี่ยนรหัสผ่าน"}
      </button>

      {status ? <p style={{ margin: 0 }}>{status}</p> : null}
    </form>
  );
}
