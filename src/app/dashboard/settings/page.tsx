import DashboardModulePage from "@/components/dashboard-module-page";

export default function SettingsPage() {
  return (
    <DashboardModulePage
      title="ตั้งค่า"
      subtitle="ข้อมูลโปรไฟล์ผู้ใช้จากตาราง users"
      table="users"
      columns={[
        { key: "display_name", label: "ชื่อที่แสดง" },
        { key: "email", label: "อีเมล" },
        { key: "locale", label: "ภาษา" },
        { key: "currency", label: "สกุลเงิน" },
        { key: "theme", label: "ธีม" }
      ]}
    />
  );
}
