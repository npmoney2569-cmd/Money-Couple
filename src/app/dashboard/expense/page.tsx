import DashboardModulePage from "@/components/dashboard-module-page";

export default function ExpensePage() {
  return (
    <DashboardModulePage
      title="รายจ่าย"
      subtitle="ข้อมูลจริงจากตาราง transactions (type = expense)"
      table="transactions"
      filter={{ field: "type", value: "expense" }}
      columns={[
        { key: "date", label: "วันที่" },
        { key: "amount", label: "จำนวนเงิน" },
        { key: "merchant", label: "ร้านค้า" },
        { key: "note", label: "โน้ต" },
        { key: "source", label: "ช่องทาง" }
      ]}
    />
  );
}
