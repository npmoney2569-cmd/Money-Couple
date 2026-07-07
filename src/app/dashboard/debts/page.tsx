import CrudPage from "@/components/crud-page";

export default function DebtsPage() {
  return (
    <CrudPage
      title="หนี้สิน"
      subtitle="จัดการหนี้สินจากตาราง debts"
      table="debts"
      orderBy="created_at"
      fields={[
        { key: "counterparty", label: "คู่สัญญา", type: "text", required: true, placeholder: "ชื่อบุคคล/สถาบัน" },
        { key: "type", label: "ประเภท", type: "select", required: true, options: [
          { label: "เราเป็นหนี้", value: "we_owe" },
          { label: "เขาเป็นหนี้เรา", value: "they_owe" },
        ]},
        { key: "principal", label: "เงินต้น", type: "number", required: true },
        { key: "interest_rate", label: "ดอกเบี้ย (%/ปี)", type: "number", placeholder: "0" },
        { key: "total_installments", label: "จำนวนงวด", type: "number", placeholder: "0" },
        { key: "due_date", label: "กำหนดชำระ", type: "date" },
        { key: "note", label: "หมายเหตุ", type: "textarea" },
      ]}
      columns={[
        { key: "counterparty", label: "คู่สัญญา" },
        { key: "type", label: "ประเภท" },
        { key: "principal", label: "เงินต้น" },
        { key: "interest_rate", label: "ดอกเบี้ย(%)ต่อปี" },
        { key: "due_date", label: "กำหนดชำระ" },
      ]}
    />
  );
}
