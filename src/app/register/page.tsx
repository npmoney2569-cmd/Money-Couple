import Link from "next/link";
import AuthForm from "@/components/auth-form";

export default function RegisterPage() {
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
        <h1 style={{ marginTop: 0 }}>สมัครสมาชิก</h1>
        <p>เริ่มต้นระบบบัญชีรายรับรายจ่าย CMN</p>
        <AuthForm mode="register" />
        <p>
          มีบัญชีแล้ว? <Link href="/login">เข้าสู่ระบบ</Link>
        </p>
      </section>
    </main>
  );
}
