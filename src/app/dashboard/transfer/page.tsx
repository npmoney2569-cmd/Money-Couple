import CrudPage from "@/components/crud-page";

export default function TransferPage() {
  return (
    <CrudPage
      title="โอนเงิน"
      subtitle="บันทึกการโอนเงินระหว่างบัญชี"
      table="transactions"
      filter={{ field: "type", value: "transfer" }}
      orderBy="date"
      fields={[
        { key: "type", label: "ประเภท", type: "select", required: true, options: [{ label: "โอนเงิน", value: "transfer" }] },
        { key: "amount", label: "จำนวนเงิน", type: "number", required: true },
        { key: "date", label: "วันที่", type: "date", required: true },
        {
          key: "account_id",
          label: "บัญชีต้นทาง",
          type: "select",
          required: true,
          placeholder: "เลือกบัญชีต้นทาง",
          optionsQuery: { table: "accounts", labelKey: "name", valueKey: "id", filter: { is_active: true }, orderBy: "name", orderAscending: true },
        },
        {
          key: "to_account_id",
          label: "บัญชีปลายทาง",
          type: "select",
          required: true,
          placeholder: "เลือกบัญชีปลายทาง",
          optionsQuery: { table: "accounts", labelKey: "name", valueKey: "id", filter: { is_active: true }, orderBy: "name", orderAscending: true },
        },
        { key: "fee_amount", label: "ค่าธรรมเนียม", type: "number", placeholder: "0" },
        { key: "note", label: "โน้ต", type: "textarea" },
      ]}
      columns={[
        { key: "date", label: "วันที่" },
        { key: "amount", label: "จำนวนเงิน" },
        { key: "account_id", label: "บัญชีต้นทาง" },
        { key: "to_account_id", label: "บัญชีปลายทาง" },
        { key: "fee_amount", label: "ค่าธรรมเนียม" },
      ]}
    />
  );
}
