"use client";

import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { History, Eye, ArrowLeft, ArrowRight } from "lucide-react";
import styles from "./audit-logs.module.css";

type AuditLog = {
  id: string;
  entity_type: string;
  entity_id: string;
  action: "create" | "update" | "delete";
  details: any;
  created_at: string;
};

const TABLE_TRANSLATIONS: Record<string, string> = {
  transactions: "ธุรกรรม (รายรับ/รายจ่าย/โอน)",
  budgets: "งบประมาณ",
  goals: "เป้าหมายการออม",
  debts: "หนี้สิน",
  assets: "สินทรัพย์",
  bills_subscriptions: "บิล/บริการรายเดือน",
};

const ACTION_TRANSLATIONS: Record<string, { label: string; colorClass: string }> = {
  create: { label: "สร้างใหม่", colorClass: styles.actionCreate },
  update: { label: "แก้ไข", colorClass: styles.actionUpdate },
  delete: { label: "ลบออก", colorClass: styles.actionDelete },
};

export default function AuditLogsPage() {
  const supabase = useMemo(() => createClient(), []);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Pagination
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 20;

  // Detail Modal
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  async function loadLogs(pageNum: number) {
    setLoading(true);
    setError(null);

    try {
      const from = (pageNum - 1) * pageSize;
      const to = from + pageSize - 1;

      const { data, error: fetchError, count } = await supabase
        .from("audit_logs")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(from, to);

      if (fetchError) throw fetchError;

      setLogs((data as AuditLog[]) || []);
      setTotalCount(count ?? 0);
    } catch (err: any) {
      setError(err.message || "เกิดข้อผิดพลาดในการโหลดประวัติกิจกรรม");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadLogs(page);
  }, [page]);

  const totalPages = Math.ceil(totalCount / pageSize);

  // Helper to format details nicely
  function getSummaryText(log: AuditLog) {
    try {
      const actionText = ACTION_TRANSLATIONS[log.action]?.label || log.action;
      const tableText = TABLE_TRANSLATIONS[log.entity_type] || log.entity_type;
      
      let extra = "";
      const info = log.action === "update" ? log.details?.new : log.details;
      
      if (info) {
        if (info.amount) extra = ` (ยอดเงิน: ฿${Number(info.amount).toLocaleString()})`;
        else if (info.name) extra = ` (ชื่อ: "${info.name}")`;
        else if (info.counterparty) extra = ` (เจ้าหนี้/ลูกหนี้: "${info.counterparty}")`;
      }
      
      return `${actionText}ข้อมูล${tableText}${extra}`;
    } catch {
      return `ทำรายการ ${log.action} บนตาราง ${log.entity_type}`;
    }
  }

  return (
    <main className={styles.page}>
      <div className={styles.header}>
        <div className={styles.headerTitleBox}>
          <div className={styles.iconBox}>
            <History size={22} />
          </div>
          <div>
            <h1 className={styles.title}>ประวัติกิจกรรม (Audit Logs)</h1>
            <p className={styles.subtitle}>บันทึกประวัติการสร้าง แก้ไข และลบข้อมูลการเงินภายในระบบ</p>
          </div>
        </div>
      </div>

      {error && <div className={styles.errorAlert}>{error}</div>}

      <div className={styles.card}>
        {loading ? (
          <div className={styles.loadingWrap}>
            <div className={styles.spinner} />
            <p>กำลังโหลดประวัติ...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className={styles.emptyState}>ยังไม่มีประวัติกิจกรรมบันทึกอยู่ในระบบ</div>
        ) : (
          <>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>วัน-เวลา</th>
                    <th>ประเภทข้อมูล</th>
                    <th>การกระทำ</th>
                    <th>รายละเอียดเบื้องต้น</th>
                    <th style={{ textAlign: "center" }}>ดูรายละเอียด</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => {
                    const actionInfo = ACTION_TRANSLATIONS[log.action] || { label: log.action, colorClass: "" };
                    return (
                      <tr key={log.id}>
                        <td className={styles.dateCol}>
                          {new Date(log.created_at).toLocaleString("th-TH")}
                        </td>
                        <td className={styles.bold}>
                          {TABLE_TRANSLATIONS[log.entity_type] || log.entity_type}
                        </td>
                        <td>
                          <span className={`${styles.badge} ${actionInfo.colorClass}`}>
                            {actionInfo.label}
                          </span>
                        </td>
                        <td className={styles.summaryCol}>
                          {getSummaryText(log)}
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <button
                            type="button"
                            className={styles.viewBtn}
                            onClick={() => setSelectedLog(log)}
                          >
                            <Eye size={16} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className={styles.pagination}>
                <span className={styles.pageInfo}>
                  แสดง {((page - 1) * pageSize) + 1} - {Math.min(page * pageSize, totalCount)} จาก {totalCount} รายการ
                </span>
                <div className={styles.pageButtons}>
                  <button
                    type="button"
                    className={styles.pageBtn}
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    <ArrowLeft size={16} />
                  </button>
                  <span className={styles.pageCurrent}>
                    หน้า {page} / {totalPages}
                  </span>
                  <button
                    type="button"
                    className={styles.pageBtn}
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                  >
                    <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Details Dialog Modal */}
      {selectedLog && (
        <div className={styles.overlay} onClick={() => setSelectedLog(null)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>รายละเอียดข้อมูลการเปลี่ยนเปลง</h3>
              <button type="button" className={styles.closeBtn} onClick={() => setSelectedLog(null)}>✕</button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.metaRow}>
                <strong>วัน-เวลา:</strong> {new Date(selectedLog.created_at).toLocaleString("th-TH")}
              </div>
              <div className={styles.metaRow}>
                <strong>โมดูล/ตาราง:</strong> {TABLE_TRANSLATIONS[selectedLog.entity_type] || selectedLog.entity_type}
              </div>
              <div className={styles.metaRow}>
                <strong>ประเภทการกระทำ:</strong> {ACTION_TRANSLATIONS[selectedLog.action]?.label || selectedLog.action}
              </div>
              <div className={styles.metaRow}>
                <strong>Entity ID:</strong> <code className={styles.code}>{selectedLog.entity_id}</code>
              </div>
              
              <div className={styles.jsonSection}>
                <strong>ข้อมูล JSON ดิบ:</strong>
                <pre className={styles.pre}>
                  {JSON.stringify(selectedLog.details, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
