import CrudPage from "@/components/crud-page";

export default function SubscriptionsPage() {
  return (
    <CrudPage
      title="บิล / Subscription"
      subtitle="จัดการบิลและค่าบริการรายเดือนจากตาราง bills_subscriptions"
      table="bills_subscriptions"
      orderBy="due_day"
      orderAscending={true}
      fields={[
        { key: "name", label: "ชื่อรายการ", type: "text", required: true, placeholder: "เช่น Netflix, ค่าไฟฟ้า" },
        { key: "type", label: "ประเภท", type: "select", required: true, options: [
          { label: "บิล", value: "bill" },
          { label: "ค่าบริการ", value: "subscription" },
        ]},
        { key: "amount", label: "จำนวนเงิน", type: "number", required: true },
        { key: "due_day", label: "กำหนดวัน (1-31)", type: "number", required: true, placeholder: "1" },
        {
          key: "account_id",
          label: "บัญชีตัดจ่าย",
          type: "select",
          placeholder: "เลือกบัญชี (ถ้ามี)",
          optionsQuery: { table: "accounts", labelKey: "name", labelKeys: ["users(display_name)"], labelSeparator: " - ", valueKey: "id", filter: { is_active: true }, orderBy: "name", orderAscending: true },
        },
        {
          key: "category_id",
          label: "หมวดหมู่",
          type: "select",
          placeholder: "เลือกหมวดหมู่ (ถ้ามี)",
          optionsQuery: { table: "categories", labelKey: "name", valueKey: "id", filter: { type: "expense" }, orderBy: "sort_order", orderAscending: true },
        },
        { key: "remind_days_before", label: "แจ้งก่อน (วัน)", type: "number", placeholder: "3" },
        { key: "is_active", label: "ใช้งาน", type: "checkbox", placeholder: "เปิดใช้งาน" },
      ]}
      columns={[
        { key: "name", label: "รายการ" },
        { key: "type", label: "ประเภท" },
        { key: "amount", label: "จำนวนเงิน" },
        { key: "due_day", label: "กำหนดวัน" },
        { key: "is_active", label: "ใช้งาน" },
      ]}
    />
  );
}
