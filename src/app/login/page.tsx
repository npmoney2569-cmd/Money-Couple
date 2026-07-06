import Link from "next/link";
import AuthForm from "@/components/auth-form";

export default function LoginPage() {
  return (
    <main style={{ display: "grid", placeItems: "center", padding: "48px 20px" }}>
      <section
        style={{
          width: "min(440px, 100%)",
          background: "var(--card)",
          borderRadius: 20,
          padding: 24,
          border: "1px solid #dce8de",
        }}
      >
        <h1 style={{ marginTop: 0 }}>เข้าสู่ระบบ</h1>
        <p>จัดการบัญชีรายรับรายจ่ายของคุณได้ในที่เดียว</p>
        <AuthForm mode="login" />
        <p>
          ยังไม่มีบัญชี? <Link href="/register">สมัครสมาชิก</Link>
        </p>
      </section>
    </main>
  );
}
