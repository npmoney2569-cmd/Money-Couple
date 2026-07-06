import DashboardModulePage from "@/components/dashboard-module-page";

export default function SearchPage() {
  return (
    <DashboardModulePage
      title="ค้นหา / กรอง"
      subtitle="ตารางรายการล่าสุด (ต่อยอดฟิลเตอร์ฝั่ง UI ได้ทันที)"
      table="transactions"
      columns={[
        { key: "date", label: "วันที่" },
        { key: "type", label: "ประเภท" },
        { key: "amount", label: "จำนวนเงิน" },
        { key: "merchant", label: "ร้านค้า" },
        { key: "source", label: "แหล่งที่มา" }
      ]}
    />
  );
}
