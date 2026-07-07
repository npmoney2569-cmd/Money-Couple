import CrudPage from "@/components/crud-page";

export default function AccountsPage() {
  return (
    <CrudPage
      title="บัญชี"
      subtitle="สร้าง แก้ไข และดูข้อมูลบัญชีจากตาราง accounts"
      table="accounts"
      orderBy="name"
      orderAscending={true}
      fields={[
        { key: "name", label: "ชื่อบัญชี", type: "text", placeholder: "เช่น เงินสด" , required: true},
        { key: "type", label: "ประเภท", type: "select", required: true, options: [
          { label: "เงินสด", value: "cash" },
          { label: "ธนาคาร", value: "bank" },
          { label: "บัตรเครดิต", value: "credit_card" },
          { label: "e-Wallet", value: "e_wallet" },
          { label: "การลงทุน", value: "investment" },
        ]},
        { key: "balance", label: "ยอดคงเหลือ", type: "number", placeholder: "0" },
        { key: "initial_balance", label: "ยอดเริ่มต้น", type: "number", placeholder: "0" },
        { key: "currency", label: "สกุลเงิน", type: "text", placeholder: "THB" },
        { key: "is_active", label: "ใช้งาน", type: "checkbox", placeholder: "เปิดใช้งาน" },
      ]}
      columns={[
        { key: "name", label: "ชื่อบัญชี" },
        { key: "type", label: "ประเภท" },
        { key: "balance", label: "ยอดคงเหลือ" },
        { key: "currency", label: "สกุลเงิน" },
        { key: "is_active", label: "สถานะ" },
      ]}
    />
  );
}
