import DashboardModulePage from "@/components/dashboard-module-page";

export default function GoalsPage() {
  return (
    <DashboardModulePage
      title="เป้าหมายการออม"
      subtitle="ข้อมูลจริงจากตาราง goals"
      table="goals"
      columns={[
        { key: "name", label: "เป้าหมาย" },
        { key: "target_amount", label: "เป้าหมายเงิน" },
        { key: "current_amount", label: "ยอดปัจจุบัน" },
        { key: "target_date", label: "วันที่เป้าหมาย" },
        { key: "created_at", label: "สร้างเมื่อ" }
      ]}
    />
  );
}
