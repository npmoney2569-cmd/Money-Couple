import CrudPage from "@/components/crud-page";

export default function BudgetsPage() {
  return (
    <CrudPage
      title="งบประมาณ"
      subtitle="สร้างงบประมาณรายเดือนและติดตามการใช้งาน"
      table="budgets"
      orderBy="start_date"
      fields={[
        { key: "period", label: "รอบงบ", type: "select", required: true, options: [
          { label: "รายวัน", value: "daily" },
          { label: "รายสัปดาห์", value: "weekly" },
          { label: "รายเดือน", value: "monthly" },
          { label: "รายปี", value: "yearly" },
        ]},
        { key: "amount", label: "วงเงิน", type: "number", required: true },
        { key: "start_date", label: "เริ่มต้น", type: "date", required: true },
        { key: "end_date", label: "สิ้นสุด", type: "date" },
        {
          key: "category_id",
          label: "หมวดหมู่ (เว้นว่าง = งบรวม)",
          type: "select",
          placeholder: "งบรวม (ไม่เลือกหมวดหมู่)",
          optionsQuery: { table: "categories", labelKey: "name", valueKey: "id", orderBy: "sort_order", orderAscending: true },
        },
      ]}
      columns={[
        { key: "period", label: "รอบงบ" },
        { key: "amount", label: "วงเงิน" },
        { key: "start_date", label: "เริ่มต้น" },
        { key: "end_date", label: "สิ้นสุด" },
        { key: "category_id", label: "หมวดหมู่" },
      ]}
    />
  );
}
