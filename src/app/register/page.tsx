import Link from "next/link";
import AuthForm from "@/components/auth-form";
import styles from "../login/login.module.css";

export default function RegisterPage() {
  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <h1 className={styles.title}>สมัครสมาชิก</h1>
        <p className={styles.subtitle}>เริ่มต้นระบบบัญชีรายรับรายจ่าย CMN</p>
        <AuthForm mode="register" />
        <p className={styles.footer}>
          มีบัญชีแล้ว?{" "}
          <Link className={styles.link} href="/login">
            เข้าสู่ระบบ
          </Link>
        </p>
      </section>
    </main>
  );
}
