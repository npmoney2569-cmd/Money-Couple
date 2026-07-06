import DashboardModulePage from "@/components/dashboard-module-page";

export default function SecurityPage() {
  return (
    <DashboardModulePage
      title="ความปลอดภัย"
      subtitle="ช่องทางล็อกอินจากตาราง auth_providers"
      table="auth_providers"
      columns={[
        { key: "provider", label: "Provider" },
        { key: "provider_uid", label: "Provider UID" },
        { key: "line_user_id", label: "LINE UID" },
        { key: "created_at", label: "เชื่อมต่อเมื่อ" },
        { key: "user_id", label: "User ID" }
      ]}
    />
  );
}
