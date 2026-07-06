import DashboardModulePage from "@/components/dashboard-module-page";

export default function IncomePage() {
  return (
    <DashboardModulePage
      title="รายรับ"
      subtitle="ข้อมูลจริงจากตาราง transactions (type = income)"
      table="transactions"
      filter={{ field: "type", value: "income" }}
      columns={[
        { key: "date", label: "วันที่" },
        { key: "amount", label: "จำนวนเงิน" },
        { key: "payee", label: "ผู้รับเงิน" },
        { key: "note", label: "โน้ต" },
        { key: "source", label: "ช่องทาง" }
      ]}
    />
  );
}
