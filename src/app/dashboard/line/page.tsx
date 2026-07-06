import DashboardModulePage from "@/components/dashboard-module-page";

export default function LineBotPage() {
  return (
    <DashboardModulePage
      title="LINE Bot"
      subtitle="แสดงรายการที่บันทึกผ่าน line_bot จากตาราง transactions"
      table="transactions"
      filter={{ field: "source", value: "line_bot" }}
      columns={[
        { key: "date", label: "วันที่" },
        { key: "type", label: "ประเภท" },
        { key: "amount", label: "จำนวนเงิน" },
        { key: "merchant", label: "ร้านค้า/ผู้รับ" },
        { key: "note", label: "โน้ต" }
      ]}
    />
  );
}
