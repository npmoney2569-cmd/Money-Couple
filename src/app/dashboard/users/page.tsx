import DashboardModulePage from "@/components/dashboard-module-page";

export default function UsersPage() {
  return (
    <DashboardModulePage
      title="ผู้ใช้งาน"
      subtitle="โปรไฟล์ผู้ใช้งานจากตาราง users"
      table="users"
      columns={[
        { key: "display_name", label: "ชื่อ" },
        { key: "email", label: "อีเมล" },
        { key: "created_at", label: "สมัครเมื่อ" },
        { key: "updated_at", label: "อัปเดตล่าสุด" },
        { key: "deleted_at", label: "สถานะลบ" }
      ]}
    />
  );
}
