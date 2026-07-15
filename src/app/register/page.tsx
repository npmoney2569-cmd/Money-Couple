import Link from "next/link";
import Image from "next/image";
import AuthForm from "@/components/auth-form";
import styles from "../login/login.module.css";

export default function RegisterPage() {
  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 16 }}>
          <Image src="/LOGO.png" alt="Logo" width={64} height={64} style={{ borderRadius: 12, marginBottom: 8 }} priority />
        </div>
        <h1 className={styles.title} style={{ textAlign: "center" }}>สมัครสมาชิก</h1>
        <p className={styles.subtitle} style={{ textAlign: "center" }}>เริ่มต้นระบบบัญชีรายรับรายจ่าย CMN</p>
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
