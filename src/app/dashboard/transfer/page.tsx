import DashboardModulePage from "@/components/dashboard-module-page";

export default function TransferPage() {
  return (
    <DashboardModulePage
      title="โอนเงิน"
      subtitle="ข้อมูลจริงจากตาราง transactions (type = transfer)"
      table="transactions"
      filter={{ field: "type", value: "transfer" }}
      columns={[
        { key: "date", label: "วันที่" },
        { key: "amount", label: "จำนวนเงิน" },
        { key: "account_id", label: "บัญชีต้นทาง" },
        { key: "to_account_id", label: "บัญชีปลายทาง" },
        { key: "fee_amount", label: "ค่าธรรมเนียม" }
      ]}
    />
  );
}
