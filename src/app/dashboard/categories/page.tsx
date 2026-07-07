import CrudPage from "@/components/crud-page";

export default function CategoriesPage() {
  return (
    <CrudPage
      title="หมวดหมู่"
      subtitle="สร้างและจัดการหมวดหมู่รายรับ/รายจ่าย"
      table="categories"
      orderBy="sort_order"
      fields={[
        { key: "name", label: "ชื่อหมวดหมู่", type: "text", required: true },
        { key: "type", label: "ประเภท", type: "select", required: true, options: [
          { label: "รายรับ", value: "income" },
          { label: "รายจ่าย", value: "expense" },
        ]},
        { key: "is_preset", label: "Preset", type: "checkbox", placeholder: "Preset" },
        { key: "color", label: "สี", type: "text", placeholder: "#4f46e5" },
        { key: "sort_order", label: "ลำดับ", type: "number", placeholder: "0" },
      ]}
      columns={[
        { key: "name", label: "ชื่อหมวดหมู่" },
        { key: "type", label: "ประเภท" },
        { key: "is_preset", label: "Preset" },
        { key: "color", label: "สี" },
        { key: "sort_order", label: "ลำดับ" },
      ]}
    />
  );
}
