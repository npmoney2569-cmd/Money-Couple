import CrudPage from "@/components/crud-page";

export default function ExpensePage() {
  return (
    <CrudPage
      title="รายจ่าย"
      subtitle="บันทึกรายจ่ายและดูข้อมูลจากตาราง transactions"
      table="transactions"
      filter={{ field: "type", value: "expense" }}
      orderBy="date"
      fields={[
        { key: "type", label: "ประเภท", type: "select", required: true, options: [{ label: "รายจ่าย", value: "expense" }] },
        { key: "amount", label: "จำนวนเงิน", type: "number", required: true },
        { key: "date", label: "วันที่", type: "date", required: true },
        { key: "merchant", label: "ร้านค้า", type: "text" },
        {
          key: "category_id",
          label: "หมวดหมู่",
          type: "select",
          placeholder: "เลือกหมวดหมู่",
          optionsQuery: { table: "categories", labelKey: "name", valueKey: "id", filter: { type: "expense" }, orderBy: "sort_order", orderAscending: true },
        },
        {
          key: "account_id",
          label: "บัญชี",
          type: "select",
          required: true,
          placeholder: "เลือกบัญชี",
          optionsQuery: { table: "accounts", labelKey: "name", valueKey: "id", filter: { is_active: true }, orderBy: "name", orderAscending: true },
        },
        {
          key: "tag_ids",
          label: "แท็ก (เลือกได้หลายแท็ก)",
          type: "multiselect",
          optionsQuery: { table: "tags", labelKey: "name", valueKey: "id", orderBy: "name", orderAscending: true },
        },
        { key: "note", label: "โน้ต", type: "textarea" },
      ]}
      columns={[
        { key: "date", label: "วันที่" },
        { key: "amount", label: "จำนวนเงิน" },
        { key: "merchant", label: "ร้านค้า" },
        { key: "category_id", label: "หมวดหมู่" },
        { key: "account_id", label: "บัญชี" },
        { key: "tag_ids", label: "แท็ก" },
      ]}
    />
  );
}
