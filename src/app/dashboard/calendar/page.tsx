import DashboardModulePage from "@/components/dashboard-module-page";

export default function CalendarPage() {
  return (
    <DashboardModulePage
      title="ปฏิทิน"
      subtitle="รายการทางการเงินเรียงตามวันที่จากตาราง transactions"
      table="transactions"
      orderBy="date"
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
