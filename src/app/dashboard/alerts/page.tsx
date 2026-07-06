import DashboardModulePage from "@/components/dashboard-module-page";

export default function AlertsPage() {
  return (
    <DashboardModulePage
      title="แจ้งเตือน"
      subtitle="ข้อมูลจริงจากตาราง notifications"
      table="notifications"
      columns={[
        { key: "title", label: "หัวข้อ" },
        { key: "body", label: "รายละเอียด" },
        { key: "type", label: "ประเภท" },
        { key: "is_read", label: "อ่านแล้ว" },
        { key: "created_at", label: "เวลา" }
      ]}
    />
  );
}
