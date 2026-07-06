import DashboardModulePage from "@/components/dashboard-module-page";

export default function SubscriptionsPage() {
  return (
    <DashboardModulePage
      title="บิล / Subscription"
      subtitle="ข้อมูลจริงจากตาราง bills_subscriptions"
      table="bills_subscriptions"
      orderBy="due_day"
      columns={[
        { key: "name", label: "รายการ" },
        { key: "type", label: "ประเภท" },
        { key: "amount", label: "จำนวนเงิน" },
        { key: "due_day", label: "กำหนดวัน" },
        { key: "is_active", label: "ใช้งาน" }
      ]}
    />
  );
}
