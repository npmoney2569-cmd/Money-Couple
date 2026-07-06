import DashboardModulePage from "@/components/dashboard-module-page";

export default function CategoriesPage() {
  return (
    <DashboardModulePage
      title="หมวดหมู่"
      subtitle="ข้อมูลจริงจากตาราง categories"
      table="categories"
      columns={[
        { key: "name", label: "ชื่อหมวดหมู่" },
        { key: "type", label: "ประเภท" },
        { key: "is_preset", label: "Preset" },
        { key: "color", label: "สี" },
        { key: "sort_order", label: "ลำดับ" }
      ]}
    />
  );
}
