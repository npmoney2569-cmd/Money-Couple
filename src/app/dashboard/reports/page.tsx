import DashboardModulePage from "@/components/dashboard-module-page";

export default function ReportsPage() {
  return (
    <DashboardModulePage
      title="รายงาน"
      subtitle="ข้อมูลล่าสุดเพื่อทำรายงานจากตาราง transactions"
      table="transactions"
      columns={[
        { key: "date", label: "วันที่" },
        { key: "type", label: "ประเภท" },
        { key: "amount", label: "จำนวนเงิน" },
        { key: "category_id", label: "หมวดหมู่" },
        { key: "account_id", label: "บัญชี" }
      ]}
    />
  );
}
