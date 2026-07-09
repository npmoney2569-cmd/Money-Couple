"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { RefreshCw, Plus, Trash2, Pencil, X, CheckCircle } from "lucide-react";
import styles from "./recurring.module.css";

type RecurringRow = {
  id: string;
  type: "income" | "expense";
  amount: number;
  account_id: string;
  category_id: string | null;
  frequency: "daily" | "weekly" | "monthly" | "yearly";
  next_date: string;
  end_date: string | null;
  is_active: boolean;
  note: string | null;
};

type OptionItem = { id: string; name: string };

const FREQUENCY_LABELS: Record<string, string> = {
  daily: "รายวัน",
  weekly: "รายสัปดาห์",
  monthly: "รายเดือน",
  yearly: "รายปี",
};

const empty = (): Partial<RecurringRow> => ({
  type: "expense",
  amount: 0,
  account_id: "",
  category_id: null,
  frequency: "monthly",
  next_date: new Date().toISOString().slice(0, 10),
  end_date: null,
  is_active: true,
  note: "",
});

export default function RecurringPage() {
  const supabase = useMemo(() => createClient(), []);
  const [rows, setRows] = useState<RecurringRow[]>([]);
  const [accounts, setAccounts] = useState<OptionItem[]>([]);
  const [categories, setCategories] = useState<OptionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<RecurringRow>>(empty());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [processing, setProcessing] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [recRes, accRes, catRes] = await Promise.all([
      supabase
        .from("recurring_transactions")
        .select("*")
        .order("next_date", { ascending: true }),
      supabase.from("accounts").select("id,name").eq("is_active", true),
      supabase.from("categories").select("id,name"),
    ]);
    setRows((recRes.data as RecurringRow[]) || []);
    setAccounts((accRes.data as OptionItem[]) || []);
    setCategories((catRes.data as OptionItem[]) || []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function openCreate() {
    setForm(empty());
    setEditingId(null);
    setShowForm(true);
    setStatus(null);
  }

  function openEdit(row: RecurringRow) {
    setForm({ ...row });
    setEditingId(row.id);
    setShowForm(true);
    setStatus(null);
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(empty());
  }

  async function handleSave() {
    if (!form.amount || !form.account_id || !form.next_date || !form.frequency) {
      setStatus("กรุณากรอกข้อมูลให้ครบถ้วน");
      return;
    }
    setLoading(true);
    const payload = {
      type: form.type,
      amount: Number(form.amount),
      account_id: form.account_id,
      category_id: form.category_id || null,
      frequency: form.frequency,
      next_date: form.next_date,
      end_date: form.end_date || null,
      is_active: form.is_active ?? true,
      note: form.note || null,
    };

    let error;
    if (editingId) {
      ({ error } = await supabase
        .from("recurring_transactions")
        .update(payload)
        .eq("id", editingId));
    } else {
      ({ error } = await supabase.from("recurring_transactions").insert([payload]));
    }

    if (error) {
      setStatus(`บันทึกไม่สำเร็จ: ${error.message}`);
      setLoading(false);
      return;
    }
    setStatus(editingId ? "อัปเดตสำเร็จ!" : "สร้างรายการประจำใหม่สำเร็จ!");
    closeForm();
    await loadData();
  }

  async function handleDelete(id: string) {
    if (!confirm("ลบรายการประจำนี้ใช่หรือไม่?")) return;
    setLoading(true);
    await supabase.from("recurring_transactions").delete().eq("id", id);
    setStatus("ลบเรียบร้อยแล้ว");
    await loadData();
  }

  async function handleToggleActive(row: RecurringRow) {
    await supabase
      .from("recurring_transactions")
      .update({ is_active: !row.is_active })
      .eq("id", row.id);
    await loadData();
  }

  // Process pending recurring transactions → create actual transactions
  async function handleProcessNow() {
    setProcessing(true);
    setStatus("กำลังประมวลผลรายการประจำ...");
    try {
      const today = new Date().toISOString().slice(0, 10);
      const pending = rows.filter(
        (r) => r.is_active && r.next_date <= today
      );
      if (pending.length === 0) {
        setStatus("ไม่มีรายการประจำที่ถึงกำหนดในวันนี้");
        setProcessing(false);
        return;
      }

      let created = 0;
      for (const rec of pending) {
        // Insert actual transaction
        const { error: txErr } = await supabase.from("transactions").insert([{
          type: rec.type,
          amount: rec.amount,
          account_id: rec.account_id,
          category_id: rec.category_id,
          date: rec.next_date,
          note: rec.note ? `[ประจำ] ${rec.note}` : "[รายการประจำอัตโนมัติ]",
          source: "recurring",
        }]);

        if (!txErr) {
          created++;
          // Advance next_date
          const next = advanceDate(rec.next_date, rec.frequency);
          const shouldDeactivate = rec.end_date && next > rec.end_date;
          await supabase.from("recurring_transactions").update({
            next_date: next,
            is_active: !shouldDeactivate,
          }).eq("id", rec.id);
        }
      }
      setStatus(`ประมวลผลเรียบร้อย! สร้างธุรกรรมใหม่ ${created} รายการ`);
      await loadData();
    } catch (err: any) {
      setStatus(`เกิดข้อผิดพลาด: ${err.message}`);
    }
    setProcessing(false);
  }

  function advanceDate(dateStr: string, frequency: string): string {
    const d = new Date(dateStr);
    if (frequency === "daily") d.setDate(d.getDate() + 1);
    else if (frequency === "weekly") d.setDate(d.getDate() + 7);
    else if (frequency === "monthly") d.setMonth(d.getMonth() + 1);
    else if (frequency === "yearly") d.setFullYear(d.getFullYear() + 1);
    return d.toISOString().slice(0, 10);
  }

  const today = new Date().toISOString().slice(0, 10);
  const pendingCount = rows.filter((r) => r.is_active && r.next_date <= today).length;

  return (
    <main className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>รายการประจำ (Recurring)</h1>
          <p className={styles.subtitle}>ตั้งค่าธุรกรรมที่เกิดขึ้นซ้ำๆ ตามรอบเวลา</p>
        </div>
        <div className={styles.headerActions}>
          {pendingCount > 0 && (
            <button
              type="button"
              className={styles.processBtn}
              onClick={handleProcessNow}
              disabled={processing}
            >
              <RefreshCw size={16} />
              ประมวลผลวันนี้ ({pendingCount})
            </button>
          )}
          <button type="button" className={styles.addBtn} onClick={openCreate}>
            <Plus size={16} />
            เพิ่มรายการประจำ
          </button>
        </div>
      </div>

      {status && (
        <div className={`${styles.statusBar} ${status.includes("ไม่สำเร็จ") || status.includes("ข้อผิดพลาด") ? styles.statusError : styles.statusSuccess}`}>
          {status}
        </div>
      )}

      <div className={styles.card}>
        {loading ? (
          <div className={styles.loadingWrap}>
            <div className={styles.spinner} />
            <p>กำลังโหลด...</p>
          </div>
        ) : rows.length === 0 ? (
          <div className={styles.emptyState}>
            <RefreshCw size={40} className={styles.emptyIcon} />
            <p>ยังไม่มีรายการประจำ</p>
            <button type="button" className={styles.addBtn} onClick={openCreate}>
              เพิ่มรายการประจำแรก
            </button>
          </div>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>ประเภท</th>
                  <th>จำนวนเงิน</th>
                  <th>ความถี่</th>
                  <th>วันที่ถัดไป</th>
                  <th>บัญชี</th>
                  <th>โน้ต</th>
                  <th>สถานะ</th>
                  <th style={{ textAlign: "center" }}>การกระทำ</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const acc = accounts.find((a) => a.id === row.account_id);
                  const isDue = row.is_active && row.next_date <= today;
                  return (
                    <tr key={row.id} className={isDue ? styles.rowDue : ""}>
                      <td>
                        <span className={`${styles.typeBadge} ${row.type === "income" ? styles.income : styles.expense}`}>
                          {row.type === "income" ? "รายรับ" : "รายจ่าย"}
                        </span>
                      </td>
                      <td className={styles.amount}>
                        ฿{Number(row.amount).toLocaleString()}
                      </td>
                      <td>{FREQUENCY_LABELS[row.frequency]}</td>
                      <td className={isDue ? styles.dueDate : ""}>
                        {new Date(row.next_date).toLocaleDateString("th-TH")}
                        {isDue && <span className={styles.dueMark}> ⚡ ถึงกำหนด</span>}
                      </td>
                      <td>{acc?.name ?? row.account_id.slice(0, 8) + "..."}</td>
                      <td className={styles.noteCol}>{row.note || "-"}</td>
                      <td>
                        <button
                          type="button"
                          onClick={() => handleToggleActive(row)}
                          className={`${styles.toggleBtn} ${row.is_active ? styles.active : styles.inactive}`}
                        >
                          {row.is_active ? "เปิด" : "ปิด"}
                        </button>
                      </td>
                      <td className={styles.rowActions}>
                        <button type="button" className={styles.editBtn} onClick={() => openEdit(row)}>
                          <Pencil size={14} />
                        </button>
                        <button type="button" className={styles.deleteBtn} onClick={() => handleDelete(row.id)}>
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className={styles.overlay} onClick={closeForm}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>{editingId ? "แก้ไขรายการประจำ" : "เพิ่มรายการประจำใหม่"}</h3>
              <button type="button" className={styles.closeBtn} onClick={closeForm}>
                <X size={18} />
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.formGrid}>
                <label className={styles.fieldLabel}>
                  ประเภท
                  <select className={styles.select} value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as "income" | "expense" }))}>
                    <option value="income">รายรับ</option>
                    <option value="expense">รายจ่าย</option>
                  </select>
                </label>
                <label className={styles.fieldLabel}>
                  จำนวนเงิน (฿)
                  <input className={styles.input} type="number" min="0" step="0.01" value={form.amount || ""} onChange={(e) => setForm((f) => ({ ...f, amount: Number(e.target.value) }))} />
                </label>
                <label className={styles.fieldLabel}>
                  ความถี่
                  <select className={styles.select} value={form.frequency} onChange={(e) => setForm((f) => ({ ...f, frequency: e.target.value as any }))}>
                    {Object.entries(FREQUENCY_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </label>
                <label className={styles.fieldLabel}>
                  บัญชี
                  <select className={styles.select} value={form.account_id} onChange={(e) => setForm((f) => ({ ...f, account_id: e.target.value }))}>
                    <option value="">เลือกบัญชี</option>
                    {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </label>
                <label className={styles.fieldLabel}>
                  หมวดหมู่
                  <select className={styles.select} value={form.category_id || ""} onChange={(e) => setForm((f) => ({ ...f, category_id: e.target.value || null }))}>
                    <option value="">ไม่ระบุ</option>
                    {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </label>
                <label className={styles.fieldLabel}>
                  วันที่เริ่ม / ครั้งถัดไป
                  <input className={styles.input} type="date" value={form.next_date || ""} onChange={(e) => setForm((f) => ({ ...f, next_date: e.target.value }))} />
                </label>
                <label className={styles.fieldLabel}>
                  วันสิ้นสุด (ไม่บังคับ)
                  <input className={styles.input} type="date" value={form.end_date || ""} onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value || null }))} />
                </label>
                <label className={styles.fieldLabel}>
                  โน้ต
                  <input className={styles.input} type="text" placeholder="รายละเอียดเพิ่มเติม" value={form.note || ""} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} />
                </label>
                <label className={styles.checkboxLabel}>
                  <input type="checkbox" checked={form.is_active ?? true} onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))} />
                  เปิดใช้งาน
                </label>
              </div>
              {status && <p className={styles.formError}>{status}</p>}
              <div className={styles.modalActions}>
                <button type="button" className={styles.saveBtn} onClick={handleSave} disabled={loading}>
                  <CheckCircle size={16} />
                  {editingId ? "บันทึกการแก้ไข" : "สร้างรายการประจำ"}
                </button>
                <button type="button" className={styles.cancelBtn} onClick={closeForm}>ยกเลิก</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
