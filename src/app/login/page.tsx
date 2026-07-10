import Link from "next/link";
import AuthForm from "@/components/auth-form";
import styles from "./login.module.css";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ registered?: string; error?: string }>;
}) {
  const params = await searchParams;
  const justRegistered = params.registered === "1";

  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 16 }}>
          <img src="/LOGO.png" alt="Logo" style={{ height: 64, width: "auto", borderRadius: 12, marginBottom: 8 }} />
        </div>
        <h1 className={styles.title} style={{ textAlign: "center" }}>เข้าสู่ระบบ</h1>
        {justRegistered ? (
          <p className={styles.successBanner}>
            ✅ สมัครสมาชิกสำเร็จ! กรุณายืนยันอีเมลของคุณแล้วเข้าสู่ระบบได้เลย
          </p>
        ) : (
          <p className={styles.subtitle}>จัดการบัญชีรายรับรายจ่ายของคุณได้ในที่เดียว</p>
        )}
        <AuthForm mode="login" />
        <p className={styles.footer}>
          ยังไม่มีบัญชี?{" "}
          <Link className={styles.link} href="/register">
            สมัครสมาชิก
          </Link>
        </p>
      </section>
    </main>
  );
}
