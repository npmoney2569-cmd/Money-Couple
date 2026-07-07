import CrudPage from "@/components/crud-page";

export default function TagsPage() {
  return (
    <CrudPage
      title="แท็ก"
      subtitle="จัดการแท็กสำหรับติดป้ายรายการธุรกรรมจากตาราง tags"
      table="tags"
      orderBy="name"
      orderAscending={true}
      fields={[
        { key: "name", label: "ชื่อแท็ก", type: "text", required: true, placeholder: "เช่น งาน, ครอบครัว, จำเป็น" },
        { key: "color", label: "สีแท็ก", type: "text", placeholder: "#22c55e" },
      ]}
      columns={[
        { key: "name", label: "ชื่อแท็ก" },
        { key: "color", label: "สี" },
      ]}
    />
  );
}
