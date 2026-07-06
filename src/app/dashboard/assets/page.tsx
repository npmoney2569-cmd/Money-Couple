import DashboardModulePage from "@/components/dashboard-module-page";

export default function AssetsPage() {
  return (
    <DashboardModulePage
      title="สินทรัพย์"
      subtitle="ข้อมูลจริงจากตาราง assets"
      table="assets"
      columns={[
        { key: "name", label: "ชื่อสินทรัพย์" },
        { key: "type", label: "ประเภท" },
        { key: "current_value", label: "มูลค่าปัจจุบัน" },
        { key: "purchase_price", label: "ราคาซื้อ" },
        { key: "purchase_date", label: "วันที่ซื้อ" }
      ]}
    />
  );
}
