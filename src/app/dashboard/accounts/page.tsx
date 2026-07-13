import CrudPage from "@/components/crud-page";
import { BankIcon, BANK_PRESETS } from "@/components/bank-icon";

export default function AccountsPage() {
  return (
    <CrudPage
      title="บัญชี"
      subtitle="สร้าง แก้ไข และดูข้อมูลบัญชีจากตาราง accounts"
      table="accounts"
      orderBy="name"
      orderAscending={true}
      fields={[
        { key: "name", label: "ชื่อบัญชี", type: "text", placeholder: "เช่น เงินสด", required: true },
        {
          key: "bank_preset", label: "ไอคอน / ธนาคาร", type: "select", options: [
            { label: "กระเป๋าเงิน (ค่าเริ่มต้น)", value: "" },
            ...Object.entries(BANK_PRESETS).map(([value, bank]) => ({ value, label: bank.label }))
          ]
        },
        { key: "icon_url", label: "อัปโหลดโลโก้เอง (ถ้ามี)", type: "file" },
        {
          key: "type", label: "ประเภท", type: "select", required: true, options: [
            { label: "เงินสด", value: "cash" },
            { label: "ธนาคาร", value: "bank" },
            { label: "บัตรเครดิต", value: "credit_card" },
            { label: "e-Wallet", value: "e_wallet" },
            { label: "การลงทุน", value: "investment" },
            { label: "ออมเงิน (เป้าหมาย)", value: "savings" },
          ]
        },
        { key: "balance", label: "ยอดคงเหลือ", type: "number", placeholder: "0" },
        { key: "initial_balance", label: "ยอดเริ่มต้น", type: "number", placeholder: "0" },
        { key: "currency", label: "สกุลเงิน", type: "text", placeholder: "THB" },
        { key: "is_active", label: "ใช้งาน", type: "checkbox", placeholder: "เปิดใช้งาน" },
      ]}
      columns={[
        { key: "icon", label: "", render: (_, row) => <BankIcon preset={row.bank_preset as string} url={row.icon_url as string} size={32} /> },
        { key: "name", label: "ชื่อบัญชี" },
        { key: "type", label: "ประเภท" },
        { key: "balance", label: "ยอดคงเหลือ" },
        { key: "currency", label: "สกุลเงิน" },
        { key: "is_active", label: "สถานะ" },
      ]}
    />
  );
}
