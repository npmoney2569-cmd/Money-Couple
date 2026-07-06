import DashboardModulePage from "@/components/dashboard-module-page";

export default function BudgetsPage() {
  return (
    <DashboardModulePage
      title="งบประมาณ"
      subtitle="ข้อมูลจริงจากตาราง budgets"
      table="budgets"
      orderBy="start_date"
      columns={[
        { key: "period", label: "รอบงบ" },
        { key: "amount", label: "วงเงิน" },
        { key: "start_date", label: "เริ่มต้น" },
        { key: "end_date", label: "สิ้นสุด" },
        { key: "category_id", label: "หมวดหมู่" }
      ]}
    />
  );
}
