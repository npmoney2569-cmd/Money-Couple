"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import CrudPage from "@/components/crud-page";

export default function BudgetsPage() {
  const supabase = useMemo(() => createClient(), []);
  const [coupleId, setCoupleId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"personal" | "couple">("personal");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkCouple() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("couple_members")
        .select("couple_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (data) {
        setCoupleId(data.couple_id);
      }
      setLoading(false);
    }
    checkCouple();
  }, [supabase]);

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "50vh", color: "var(--text-secondary)" }}>
        กำลังตรวจสอบข้อมูลความสัมพันธ์...
      </div>
    );
  }

  // Common field and column configurations
  const fields = [
    { key: "period", label: "รอบงบ", type: "select" as const, required: true, options: [
      { label: "รายวัน", value: "daily" },
      { label: "รายสัปดาห์", value: "weekly" },
      { label: "รายเดือน", value: "monthly" },
      { label: "รายปี", value: "yearly" },
    ]},
    { key: "amount", label: "วงเงิน", type: "number" as const, required: true },
    { key: "start_date", label: "เริ่มต้น", type: "date" as const, required: true },
    { key: "end_date", label: "สิ้นสุด", type: "date" as const },
    {
      key: "category_id",
      label: "หมวดหมู่ (เว้นว่าง = งบรวม)",
      type: "select" as const,
      placeholder: "งบรวม (ไม่เลือกหมวดหมู่)",
      optionsQuery: { table: "categories", labelKey: "name", valueKey: "id", orderBy: "sort_order", orderAscending: true },
    },
  ];

  const columns = [
    { key: "period", label: "รอบงบ" },
    { key: "amount", label: "วงเงิน" },
    { key: "start_date", label: "เริ่มต้น" },
    { key: "end_date", label: "สิ้นสุด" },
    { key: "category_id", label: "หมวดหมู่" },
  ];

  // If not in a couple, render personal budgets directly
  if (!coupleId) {
    return (
      <CrudPage
        title="งบประมาณ"
        subtitle="สร้างงบประมาณรายเดือนและติดตามการใช้งาน"
        table="budgets"
        orderBy="start_date"
        filter={{ field: "couple_id", value: null }}
        fields={fields}
        columns={columns}
      />
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Premium Tabs Selector */}
      <div style={{
        display: "flex",
        background: "rgba(15, 32, 67, 0.4)",
        padding: "6px",
        borderRadius: "12px",
        border: "1px solid rgba(255, 255, 255, 0.08)",
        width: "fit-content",
        alignSelf: "center",
      }}>
        <button
          onClick={() => setActiveTab("personal")}
          style={{
            background: activeTab === "personal" ? "linear-gradient(135deg, #4f8cff, #38bdf8)" : "transparent",
            color: activeTab === "personal" ? "#ffffff" : "var(--text-secondary)",
            border: "none",
            padding: "8px 20px",
            borderRadius: "8px",
            fontSize: "14px",
            fontWeight: "500",
            cursor: "pointer",
            transition: "all 0.2s ease",
          }}
        >
          👤 งบประมาณส่วนตัว
        </button>
        <button
          onClick={() => setActiveTab("couple")}
          style={{
            background: activeTab === "couple" ? "linear-gradient(135deg, #4f8cff, #38bdf8)" : "transparent",
            color: activeTab === "couple" ? "#ffffff" : "var(--text-secondary)",
            border: "none",
            padding: "8px 20px",
            borderRadius: "8px",
            fontSize: "14px",
            fontWeight: "500",
            cursor: "pointer",
            transition: "all 0.2s ease",
          }}
        >
          💖 งบประมาณร่วม (คู่รัก)
        </button>
      </div>

      {activeTab === "personal" ? (
        <CrudPage
          key="personal-budgets"
          title="งบประมาณส่วนตัว"
          subtitle="จัดการงบประมาณการเงินของคุณคนเดียว"
          table="budgets"
          orderBy="start_date"
          filter={{ field: "couple_id", value: null }}
          fields={fields}
          columns={columns}
        />
      ) : (
        <CrudPage
          key="couple-budgets"
          title="งบประมาณร่วม (คู่รัก)"
          subtitle="จัดการงบประมาณค่าใช้จ่ายต่างๆ ร่วมกับคู่รักของคุณ"
          table="budgets"
          orderBy="start_date"
          filter={{ field: "couple_id", value: coupleId }}
          additionalPayload={{ couple_id: coupleId }}
          fields={fields}
          columns={columns}
        />
      )}
    </div>
  );
}
