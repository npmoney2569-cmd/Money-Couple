"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type AuthMode = "login" | "register";

type AuthFormProps = {
  mode: AuthMode;
};

export default function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const supabase = createClient();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const isLogin = mode === "login";

  function getSafeNextPath() {
    const params = new URLSearchParams(window.location.search);
    const next = params.get("next") ?? "/dashboard";
    if (!next.startsWith("/") || next.startsWith("//")) {
      return "/dashboard";
    }
    return next;
  }

  async function onOAuthSignIn(provider: "google" | "line") {
    setLoading(true);
    setMessage(null);

    const nextPath = getSafeNextPath();
    const origin = window.location.origin;
    const redirectTo = `${origin}/auth/callback?next=${encodeURIComponent(nextPath)}`;

    const { error } = await supabase.auth.signInWithOAuth({
      provider: provider as any,
      options: {
        redirectTo,
      },
    });

    if (error) {
      setMessage(error.message);
      setLoading(false);
    }
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);

    const normalizedInput = identifier.trim().toLowerCase();
    const email =
      isLogin && normalizedInput === "admin"
        ? "admin@cmn.local"
        : normalizedInput;

    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setMessage(error.message);
        setLoading(false);
        return;
      }

      router.push(getSafeNextPath());
      router.refresh();
      return;
    }

    const { error } = await supabase.auth.signUp({ email, password });
    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    setMessage("สมัครสมาชิกสำเร็จ กรุณาตรวจอีเมลเพื่อยืนยันบัญชี");
    setLoading(false);
  }

  return (
    <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
      <label style={{ display: "grid", gap: 6 }}>
        <span>{isLogin ? "Email หรือ Username" : "Email"}</span>
        <input
          type={isLogin ? "text" : "email"}
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          required
          placeholder={isLogin ? "admin หรือ your@email.com" : "your@email.com"}
          style={{
            border: "1px solid #c6d9cc",
            borderRadius: 10,
            padding: "10px 12px",
            fontSize: 16,
          }}
        />
      </label>

      <label style={{ display: "grid", gap: 6 }}>
        <span>Password</span>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          style={{
            border: "1px solid #c6d9cc",
            borderRadius: 10,
            padding: "10px 12px",
            fontSize: 16,
          }}
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
          fontSize: 16,
          cursor: loading ? "not-allowed" : "pointer",
        }}
      >
        {loading ? "กำลังดำเนินการ..." : isLogin ? "เข้าสู่ระบบ" : "สมัครสมาชิก"}
      </button>

      {isLogin ? (
        <>
          <button
            type="button"
            disabled={loading}
            onClick={() => onOAuthSignIn("google")}
            style={{
              background: "#ffffff",
              color: "#10221b",
              border: "1px solid #c6d9cc",
              borderRadius: 10,
              padding: "10px 12px",
              fontSize: 15,
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            เข้าสู่ระบบด้วย Google
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() => onOAuthSignIn("line")}
            style={{
              background: "#06c755",
              color: "#ffffff",
              border: "1px solid #06c755",
              borderRadius: 10,
              padding: "10px 12px",
              fontSize: 15,
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            เข้าสู่ระบบด้วย LINE
          </button>
          <p style={{ margin: 0 }}>
            <Link href="/forgot-password">ลืมรหัสผ่าน?</Link>
          </p>
        </>
      ) : null}

      {message ? <p style={{ margin: 0, color: "#123a2c" }}>{message}</p> : null}
    </form>
  );
}
