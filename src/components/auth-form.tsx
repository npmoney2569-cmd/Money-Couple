"use client";

import { useState, useEffect } from "react";
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
  const ENABLE_GOOGLE_OAUTH = false;
  const ENABLE_LINE_OAUTH = true; // Phase 3 — ทำทีหลังสุด
  const [identifier, setIdentifier] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const error = params.get("error");
      const detail = params.get("detail");
      if (error) {
        if (error === "line_token_failed") {
          try {
            const parsedDetail = JSON.parse(detail || "");
            setMessage(`เข้าสู่ระบบด้วย LINE ล้มเหลว: ${parsedDetail.error_description || parsedDetail.error || detail}`);
          } catch {
            setMessage(`เข้าสู่ระบบด้วย LINE ล้มเหลว (Token exchange failed): ${detail || ""}`);
          }
        } else {
          setMessage(`เข้าสู่ระบบล้มเหลว: ${error} ${detail ? `(${detail})` : ""}`);
        }
      }
    }
  }, []);

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

    if (provider === "line") {
      const clientId = "2010660050";
      const redirectUri = `${origin}/auth/line/callback`;
      const state = Math.random().toString(36).substring(2, 15);
      
      if (typeof window !== "undefined") {
        sessionStorage.setItem("line_oauth_state", state);
      }

      const lineAuthUrl = `https://access.line.me/oauth2/v2.1/authorize?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(
        redirectUri
      )}&state=${state}&scope=profile%20openid%20email`;

      window.location.href = lineAuthUrl;
      return;
    }

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

    if (isLogin) {
      let email = normalizedInput;

      if (!normalizedInput.includes("@")) {
        if (normalizedInput === "admin") {
          email = "admin@cmn.local";
        } else {
          const { data: resolvedEmail, error: resolveError } = await supabase.rpc("resolve_login_email", {
            login_input: normalizedInput,
          });

          if (resolveError) {
            setMessage("ยังไม่รองรับการล็อกอินด้วย Username กรุณาใช้อีเมล หรือให้แอดมินรันสคริปต์ username-auth");
            setLoading(false);
            return;
          }

          if (!resolvedEmail || typeof resolvedEmail !== "string") {
            setMessage("ไม่พบ Username นี้ กรุณาตรวจสอบอีกครั้ง");
            setLoading(false);
            return;
          }

          email = resolvedEmail.toLowerCase();
        }
      }

      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        const msg = error.message.toLowerCase();
        if (msg.includes("email not confirmed")) {
          setMessage("กรุณายืนยันอีเมลของคุณก่อนเข้าสู่ระบบ (ตรวจสอบในอีเมล)");
        } else if (msg.includes("invalid login credentials")) {
          setMessage("อีเมล/Username หรือรหัสผ่านไม่ถูกต้อง");
        } else {
          setMessage(error.message);
        }
        setLoading(false);
        return;
      }

      router.push(getSafeNextPath());
      router.refresh();
      return;
    }

    const normalizedUsername = username.trim().toLowerCase();
    const usernameRegex = /^[a-z0-9_]{3,30}$/;

    if (!usernameRegex.test(normalizedUsername)) {
      setMessage("Username ต้องยาว 3-30 ตัว และใช้ได้เฉพาะ a-z, 0-9, _");
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setMessage("รหัสผ่านและยืนยันรหัสผ่านไม่ตรงกัน");
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.signUp({
      email: normalizedInput,
      password,
      options: {
        data: {
          username: normalizedUsername,
          full_name: normalizedUsername,
        },
      },
    });
    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes("rate limit") || msg.includes("too many")) {
        setMessage("สมัครบ่อยเกินไป กรุณารอสักครู่แล้วลองใหม่");
      } else if (msg.includes("already registered") || msg.includes("already exists")) {
        setMessage("อีเมลนี้มีบัญชีอยู่แล้ว กรุณาเข้าสู่ระบบแทน");
      } else if (msg.includes("invalid email") || msg.includes("is invalid")) {
        setMessage("รูปแบบอีเมลไม่ถูกต้อง");
      } else if (msg.includes("password") && msg.includes("short")) {
        setMessage("รหัสผ่านต้องยาวอย่างน้อย 6 ตัวอักษร");
      } else {
        setMessage(error.message);
      }
      setLoading(false);
      return;
    }

    setLoading(false);
    router.push("/login?registered=1");
    router.refresh();
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

      {!isLogin ? (
        <label style={{ display: "grid", gap: 6 }}>
          <span>Username</span>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            placeholder="เช่น nutnaker_01"
            style={{
              border: "1px solid #c6d9cc",
              borderRadius: 10,
              padding: "10px 12px",
              fontSize: 16,
            }}
          />
        </label>
      ) : null}

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

      {!isLogin ? (
        <label style={{ display: "grid", gap: 6 }}>
          <span>ยืนยัน Password</span>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
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
      ) : null}

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
          {ENABLE_GOOGLE_OAUTH ? (
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
          ) : null}
          {ENABLE_LINE_OAUTH ? (
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
          ) : null}
          <p style={{ margin: 0 }}>
            <Link href="/forgot-password">ลืมรหัสผ่าน?</Link>
          </p>
        </>
      ) : null}

      {message ? <p style={{ margin: 0, color: "#123a2c" }}>{message}</p> : null}
    </form>
  );
}
