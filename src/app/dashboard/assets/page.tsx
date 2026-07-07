import CrudPage from "@/components/crud-page";

export default function AssetsPage() {
  return (
    <CrudPage
      title="สินทรัพย์"
      subtitle="จัดการสินทรัพย์จากตาราง assets"
      table="assets"
      orderBy="created_at"
      fields={[
        { key: "name", label: "ชื่อสินทรัพย์", type: "text", required: true, placeholder: "เช่น บ้าน, รถยนต์" },
        { key: "type", label: "ประเภท", type: "select", required: true, options: [
          { label: "บ้าน/ที่ดิน", value: "house" },
          { label: "รถยนต์", value: "car" },
          { label: "หุ้น", value: "stock" },
          { label: "กองทุน", value: "fund" },
          { label: "คริปโต", value: "crypto" },
          { label: "เงินฝากประจำ", value: "deposit" },
        ]},
        { key: "current_value", label: "มูลค่าปัจจุบัน", type: "number", required: true },
        { key: "purchase_price", label: "ราคาซื้อ", type: "number", placeholder: "0" },
        { key: "purchase_date", label: "วันที่ซื้อ", type: "date" },
        { key: "depreciation_rate", label: "อัตราเสื่อมราคา (%/ปี)", type: "number", placeholder: "0" },
        { key: "note", label: "หมายเหตุ", type: "textarea" },
      ]}
      columns={[
        { key: "name", label: "ชื่อสินทรัพย์" },
        { key: "type", label: "ประเภท" },
        { key: "current_value", label: "มูลค่าปัจจุบัน" },
        { key: "purchase_price", label: "ราคาซื้อ" },
        { key: "purchase_date", label: "วันที่ซื้อ" },
      ]}
    />
  );
}
