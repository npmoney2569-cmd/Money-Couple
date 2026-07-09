"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import styles from "./calendar.module.css";

type TxRow = {
  id: string;
  date: string;
  type: "income" | "expense" | "transfer";
  amount: number | string;
  note: string | null;
  merchant: string | null;
  payee: string | null;
  category_id: string | null;
};

type CategoryMap = Record<string, string>;

type DayData = {
  income: number;
  expense: number;
  txList: TxRow[];
};

type CalendarData = Record<string, DayData>; // key = "YYYY-MM-DD"

const THAI_MONTHS = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน",
  "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม",
  "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
];
const DAY_NAMES = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];

function fmt(val: number | string) {
  const n = typeof val === "string" ? parseFloat(val) : val;
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    maximumFractionDigits: 0,
  }).format(n);
}

function fmtFull(val: number | string) {
  const n = typeof val === "string" ? parseFloat(val) : val;
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    minimumFractionDigits: 2,
  }).format(n);
}

function num(v: number | string) {
  return typeof v === "string" ? parseFloat(v) || 0 : v || 0;
}

function toLocalDateStr(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function getTxLabel(tx: TxRow) {
  return tx.note || tx.merchant || tx.payee || (tx.type === "income" ? "รายรับ" : tx.type === "expense" ? "รายจ่าย" : "โอนเงิน");
}

export default function CalendarPage() {
  const supabase = useMemo(() => createClient(), []);

  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth()); // 0-indexed
  const [calData, setCalData] = useState<CalendarData>({});
  const [categories, setCategories] = useState<CategoryMap>({});
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  // Compute first and last day of visible month
  const firstDay = useMemo(() => new Date(year, month, 1), [year, month]);
  const lastDay = useMemo(() => new Date(year, month + 1, 0), [year, month]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setSelectedDay(null);

    const start = toLocalDateStr(firstDay);
    const end = toLocalDateStr(lastDay);

    const [txRes, catRes] = await Promise.all([
      supabase
        .from("transactions")
        .select("id,date,type,amount,note,merchant,payee,category_id")
        .gte("date", start)
        .lte("date", end)
        .order("date", { ascending: true }),
      supabase
        .from("categories")
        .select("id,name"),
    ]);

    // Build category map
    const catMap: CategoryMap = {};
    (catRes.data ?? []).forEach((c: any) => {
      catMap[c.id] = c.name;
    });
    setCategories(catMap);

    // Build calendar data map
    const data: CalendarData = {};
    (txRes.data ?? []).forEach((tx: any) => {
      const dateKey = tx.date?.slice(0, 10) ?? "";
      if (!dateKey) return;
      if (!data[dateKey]) {
        data[dateKey] = { income: 0, expense: 0, txList: [] };
      }
      const amount = num(tx.amount);
      if (tx.type === "income") {
        data[dateKey].income += amount;
      } else if (tx.type === "expense") {
        data[dateKey].expense += amount;
      }
      data[dateKey].txList.push(tx as TxRow);
    });
    setCalData(data);
    setLoading(false);
  }, [supabase, firstDay, lastDay]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Navigate months
  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  }
  function goToday() {
    setYear(today.getFullYear());
    setMonth(today.getMonth());
    setSelectedDay(toLocalDateStr(today));
  }

  // Build grid cells (6 weeks max)
  const gridCells = useMemo(() => {
    const cells: (Date | null)[] = [];
    const startPad = firstDay.getDay(); // 0=Sun
    for (let i = 0; i < startPad; i++) cells.push(null);
    for (let d = 1; d <= lastDay.getDate(); d++) {
      cells.push(new Date(year, month, d));
    }
    // Pad to full 6-row grid
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [firstDay, lastDay, year, month]);

  // Summary totals for month
  const monthTotal = useMemo(() => {
    let income = 0, expense = 0;
    Object.values(calData).forEach(d => {
      income += d.income;
      expense += d.expense;
    });
    return { income, expense, net: income - expense };
  }, [calData]);

  const todayStr = toLocalDateStr(today);
  const selectedData = selectedDay ? calData[selectedDay] : null;

  return (
    <main className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>ปฏิทินการเงิน</h1>
          <p className={styles.subtitle}>
            {THAI_MONTHS[month]} {year + 543}
          </p>
        </div>
        <div className={styles.headerRight}>
          <button className={styles.navBtn} onClick={prevMonth} title="เดือนก่อน">‹</button>
          <button className={styles.todayBtn} onClick={goToday}>วันนี้</button>
          <button className={styles.navBtn} onClick={nextMonth} title="เดือนถัดไป">›</button>
        </div>
      </div>

      {/* Monthly Summary Bar */}
      <div className={styles.summaryBar}>
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>รายรับ</span>
          <span className={`${styles.summaryValue} ${styles.income}`}>{fmt(monthTotal.income)}</span>
        </div>
        <div className={styles.summaryDivider} />
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>รายจ่าย</span>
          <span className={`${styles.summaryValue} ${styles.expense}`}>{fmt(monthTotal.expense)}</span>
        </div>
        <div className={styles.summaryDivider} />
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>คงเหลือ</span>
          <span className={`${styles.summaryValue} ${monthTotal.net >= 0 ? styles.income : styles.expense}`}>
            {fmt(monthTotal.net)}
          </span>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className={styles.calendarWrap}>
        {loading && <div className={styles.loadingOverlay}><div className={styles.spinner} /></div>}

        {/* Day headers */}
        <div className={styles.dayHeaders}>
          {DAY_NAMES.map(d => (
            <div key={d} className={styles.dayHeader}>{d}</div>
          ))}
        </div>

        {/* Grid */}
        <div className={styles.grid}>
          {gridCells.map((date, idx) => {
            if (!date) {
              return <div key={`empty-${idx}`} className={styles.cellEmpty} />;
            }
            const dateStr = toLocalDateStr(date);
            const data = calData[dateStr];
            const isToday = dateStr === todayStr;
            const isSelected = dateStr === selectedDay;
            const hasIncome = data && data.income > 0;
            const hasExpense = data && data.expense > 0;

            return (
              <div
                key={dateStr}
                className={[
                  styles.cell,
                  isToday ? styles.cellToday : "",
                  isSelected ? styles.cellSelected : "",
                  data ? styles.cellHasData : "",
                ].join(" ")}
                onClick={() => setSelectedDay(isSelected ? null : dateStr)}
                role="button"
                tabIndex={0}
                onKeyDown={e => e.key === "Enter" && setSelectedDay(isSelected ? null : dateStr)}
              >
                <div className={styles.cellDate}>
                  <span className={styles.dateNum}>{date.getDate()}</span>
                </div>
                {data && (
                  <div className={styles.cellAmounts}>
                    {hasIncome && (
                      <div className={styles.amtIncome}>+{fmt(data.income)}</div>
                    )}
                    {hasExpense && (
                      <div className={styles.amtExpense}>-{fmt(data.expense)}</div>
                    )}
                  </div>
                )}
                {data && data.txList.length > 0 && (
                  <div className={styles.txCount}>{data.txList.length} รายการ</div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Day Detail Panel */}
      {selectedDay && (
        <div className={styles.detailPanel}>
          <div className={styles.detailHeader}>
            <h2 className={styles.detailTitle}>
              {new Date(selectedDay + "T00:00:00").toLocaleDateString("th-TH", {
                weekday: "long", year: "numeric", month: "long", day: "numeric",
              })}
            </h2>
            <button className={styles.closeBtn} onClick={() => setSelectedDay(null)}>✕</button>
          </div>

          {!selectedData || selectedData.txList.length === 0 ? (
            <div className={styles.detailEmpty}>ไม่มีรายการในวันนี้</div>
          ) : (
            <>
              <div className={styles.detailSummary}>
                {selectedData.income > 0 && (
                  <span className={`${styles.detailSumItem} ${styles.income}`}>
                    รายรับ {fmtFull(selectedData.income)}
                  </span>
                )}
                {selectedData.expense > 0 && (
                  <span className={`${styles.detailSumItem} ${styles.expense}`}>
                    รายจ่าย {fmtFull(selectedData.expense)}
                  </span>
                )}
              </div>
              <ul className={styles.txList}>
                {selectedData.txList.map(tx => (
                  <li key={tx.id} className={styles.txItem}>
                    <div className={[
                      styles.txBadge,
                      tx.type === "income" ? styles.badgeIncome :
                      tx.type === "expense" ? styles.badgeExpense : styles.badgeTransfer
                    ].join(" ")}>
                      {tx.type === "income" ? "↓" : tx.type === "expense" ? "↑" : "⇄"}
                    </div>
                    <div className={styles.txInfo}>
                      <div className={styles.txLabel}>{getTxLabel(tx)}</div>
                      {tx.category_id && categories[tx.category_id] && (
                        <div className={styles.txCat}>{categories[tx.category_id]}</div>
                      )}
                    </div>
                    <div className={[
                      styles.txAmount,
                      tx.type === "income" ? styles.income :
                      tx.type === "expense" ? styles.expense : styles.transfer
                    ].join(" ")}>
                      {tx.type === "income" ? "+" : tx.type === "expense" ? "-" : ""}
                      {fmtFull(tx.amount)}
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </main>
  );
}
