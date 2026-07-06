import DashboardModulePage from "@/components/dashboard-module-page";

export default function AccountsPage() {
  return (
    <DashboardModulePage
      title="บัญชี"
      subtitle="ข้อมูลจริงจากตาราง accounts"
      table="accounts"
      columns={[
        { key: "name", label: "ชื่อบัญชี" },
        { key: "type", label: "ประเภท" },
        { key: "balance", label: "ยอดคงเหลือ" },
        { key: "currency", label: "สกุลเงิน" },
        { key: "is_active", label: "สถานะ" }
      ]}
    />
  );
}
