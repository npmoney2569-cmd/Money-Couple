import DashboardModulePage from "@/components/dashboard-module-page";

export default function DebtsPage() {
  return (
    <DashboardModulePage
      title="หนี้สิน"
      subtitle="ข้อมูลจริงจากตาราง debts"
      table="debts"
      columns={[
        { key: "counterparty", label: "คู่สัญญา" },
        { key: "type", label: "ประเภท" },
        { key: "principal", label: "เงินต้น" },
        { key: "interest_rate", label: "ดอกเบี้ย(%)" },
        { key: "due_date", label: "กำหนดชำระ" }
      ]}
    />
  );
}
