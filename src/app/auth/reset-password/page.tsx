import ResetPasswordForm from "@/components/reset-password-form";

export default function ResetPasswordPage() {
  return (
    <main style={{ display: "grid", placeItems: "center", padding: "48px 20px" }}>
      <section
        style={{
          width: "min(460px, 100%)",
          background: "var(--card)",
          borderRadius: 20,
          padding: 24,
          border: "1px solid #dce8de",
        }}
      >
        <h1 style={{ marginTop: 0 }}>ตั้งรหัสผ่านใหม่</h1>
        <p>กรอกรหัสผ่านใหม่หลังจากเปิดลิงก์จากอีเมล</p>
        <ResetPasswordForm />
      </section>
    </main>
  );
}
