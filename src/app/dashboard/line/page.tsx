import DashboardModulePage from "@/components/dashboard-module-page";
import LineBotClient from "./line-bot-client";

export default function LineBotPage() {
  return (
    <div>
      {/* Client section: Add Friend banner + LINE account linking */}
      <LineBotClient />

      {/* Server section: Transaction list from LINE Bot */}
      <DashboardModulePage
        title="รายการจาก LINE Bot"
        subtitle="รายการที่บันทึกผ่าน LINE Bot"
        table="transactions"
        filter={{ field: "source", value: "line_bot" }}
        columns={[
          { key: "date", label: "วันที่" },
          { key: "type", label: "ประเภท" },
          { key: "amount", label: "จำนวนเงิน" },
          { key: "merchant", label: "ร้านค้า/ผู้รับ" },
          { key: "note", label: "โน้ต" },
        ]}
      />
    </div>
  );
}
