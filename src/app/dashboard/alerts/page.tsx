"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import styles from "./alerts.module.css";

type Notification = {
  id: string;
  title: string;
  body: string | null;
  type: string | null;
  is_read: boolean;
  created_at: string;
};

const TYPE_LABELS: Record<string, string> = {
  budget_exceeded: "เกินงบประมาณ",
  bill_due: "บิลใกล้ครบ",
  goal_achieved: "บรรลุเป้าหมาย",
  system: "ระบบ",
  info: "ข้อมูล",
};

const TYPE_COLORS: Record<string, string> = {
  budget_exceeded: "#ff6580",
  bill_due: "#ffa756",
  goal_achieved: "#2ee3a8",
  system: "#4f8cff",
  info: "#a9c2ff",
};

function typeLabel(type: string | null) {
  if (!type) return "ทั่วไป";
  return TYPE_LABELS[type] ?? type;
}

function typeColor(type: string | null) {
  if (!type) return "#a9c2ff";
  return TYPE_COLORS[type] ?? "#a9c2ff";
}

function timeAgo(dateStr: string) {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return "เมื่อกี้";
  if (diff < 3600) return `${Math.floor(diff / 60)} นาทีที่แล้ว`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} ชั่วโมงที่แล้ว`;
  return `${Math.floor(diff / 86400)} วันที่แล้ว`;
}

export default function AlertsPage() {
  const supabase = useMemo(() => createClient(), []);

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    const { data, error: err } = await supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    if (err) {
      setError(err.message);
    } else {
      setNotifications((data ?? []) as Notification[]);
      setError(null);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const displayed = useMemo(() => {
    if (!showUnreadOnly) return notifications;
    return notifications.filter((n) => !n.is_read);
  }, [notifications, showUnreadOnly]);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.is_read).length,
    [notifications]
  );

  async function markRead(id: string) {
    setActionLoading(id);
    const { error: err } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", id);
    if (err) setError(err.message);
    else {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
    }
    setActionLoading(null);
  }

  async function markAllRead() {
    setActionLoading("all");
    const unreadIds = notifications
      .filter((n) => !n.is_read)
      .map((n) => n.id);
    if (unreadIds.length === 0) {
      setActionLoading(null);
      return;
    }
    const { error: err } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .in("id", unreadIds);
    if (err) setError(err.message);
    else {
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    }
    setActionLoading(null);
  }

  async function deleteNotification(id: string) {
    if (!confirm("ลบการแจ้งเตือนนี้?")) return;
    setActionLoading(id + "_del");
    const { error: err } = await supabase
      .from("notifications")
      .delete()
      .eq("id", id);
    if (err) setError(err.message);
    else {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }
    setActionLoading(null);
  }

  return (
    <main className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>
            การแจ้งเตือน
            {unreadCount > 0 && (
              <span className={styles.badge}>{unreadCount}</span>
            )}
          </h1>
          <p className={styles.subtitle}>
            {notifications.length} รายการทั้งหมด • {unreadCount} ยังไม่ได้อ่าน
          </p>
        </div>
        <div className={styles.headerActions}>
          <button
            className={`${styles.filterBtn} ${showUnreadOnly ? styles.filterActive : ""}`}
            onClick={() => setShowUnreadOnly((v) => !v)}
          >
            {showUnreadOnly ? "📬 แสดงทั้งหมด" : "📭 ยังไม่ได้อ่าน"}
          </button>
          <button
            className={styles.markAllBtn}
            onClick={markAllRead}
            disabled={actionLoading === "all" || unreadCount === 0}
          >
            {actionLoading === "all" ? "กำลังอัปเดต..." : "✓ อ่านทั้งหมด"}
          </button>
          <button className={styles.refreshBtn} onClick={loadData} disabled={loading}>
            ↻
          </button>
        </div>
      </div>

      {error && (
        <div className={styles.errorBox}>{error}</div>
      )}

      {loading ? (
        <div className={styles.loading}>
          <div className={styles.spinner} />
          กำลังโหลด...
        </div>
      ) : displayed.length === 0 ? (
        <div className={styles.emptyState}>
          <span className={styles.emptyIcon}>🔔</span>
          <p>{showUnreadOnly ? "ไม่มีการแจ้งเตือนที่ยังไม่ได้อ่าน" : "ยังไม่มีการแจ้งเตือน"}</p>
        </div>
      ) : (
        <div className={styles.list}>
          {displayed.map((n) => (
            <div
              key={n.id}
              className={`${styles.item} ${!n.is_read ? styles.unread : ""}`}
            >
              <div
                className={styles.typeChip}
                style={{ background: typeColor(n.type) + "22", color: typeColor(n.type), borderColor: typeColor(n.type) + "55" }}
              >
                {typeLabel(n.type)}
              </div>
              <div className={styles.content}>
                <div className={styles.notifTitle}>{n.title}</div>
                {n.body && <div className={styles.notifBody}>{n.body}</div>}
                <div className={styles.meta}>{timeAgo(n.created_at)}</div>
              </div>
              <div className={styles.itemActions}>
                {!n.is_read && (
                  <button
                    className={styles.readBtn}
                    onClick={() => markRead(n.id)}
                    disabled={actionLoading === n.id}
                    title="ทำเครื่องหมายว่าอ่านแล้ว"
                  >
                    {actionLoading === n.id ? "..." : "✓"}
                  </button>
                )}
                <button
                  className={styles.delBtn}
                  onClick={() => deleteNotification(n.id)}
                  disabled={actionLoading === n.id + "_del"}
                  title="ลบ"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
