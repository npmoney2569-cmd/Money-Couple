import Link from "next/link";
import AuthForm from "@/components/auth-form";
import styles from "./login.module.css";

export default function LoginPage() {
  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <h1 className={styles.title}>เข้าสู่ระบบ</h1>
        <p className={styles.subtitle}>จัดการบัญชีรายรับรายจ่ายของคุณได้ในที่เดียว</p>
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
