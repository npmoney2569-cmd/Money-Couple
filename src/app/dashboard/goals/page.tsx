import CrudPage from "@/components/crud-page";

export default function GoalsPage() {
  return (
    <CrudPage
      title="เป้าหมายการออม"
      subtitle="ตั้งและติดตามเป้าหมายการออมจากตาราง goals"
      table="goals"
      orderBy="created_at"
      fields={[
        { key: "name", label: "ชื่อเป้าหมาย", type: "text", required: true, placeholder: "เช่น ซื้อรถ, ท่องเที่ยว" },
        { key: "target_amount", label: "เป้าหมายเงิน", type: "number", required: true },
        { key: "current_amount", label: "ยอดปัจจุบัน", type: "number", placeholder: "0" },
        { key: "target_date", label: "วันที่เป้าหมาย", type: "date" },
        { key: "icon", label: "ไอคอน", type: "text", placeholder: "เช่น 🎯" },
      ]}
      columns={[
        { key: "name", label: "เป้าหมาย" },
        { key: "target_amount", label: "เป้าหมายเงิน" },
        { key: "current_amount", label: "ยอดปัจจุบัน" },
        { key: "target_date", label: "วันที่เป้าหมาย" },
      ]}
    />
  );
}
