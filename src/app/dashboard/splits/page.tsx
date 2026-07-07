"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import styles from "@/components/form-card.module.css";

type SplitRow = {
  id: string;
  transaction_id: string;
  category_id: string;
  amount: number | string;
  note: string | null;
};

type TransactionOption = {
  id: string;
  label: string;
  amount: number | string;
};

type CategoryOption = {
  id: string;
  name: string;
};

type SplitForm = {
  transaction_id: string;
  category_id: string;
  amount: string;
  note: string;
};

function num(value: number | string | null | undefined) {
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value) || 0;
  return 0;
}

function initialForm(): SplitForm {
  return {
    transaction_id: "",
    category_id: "",
    amount: "",
    note: "",
  };
}

export default function SplitsPage() {
  const supabase = useMemo(() => createClient(), []);
  const [rows, setRows] = useState<SplitRow[]>([]);
  const [transactions, setTransactions] = useState<TransactionOption[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [form, setForm] = useState<SplitForm>(initialForm());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const categoryMap = useMemo(() => new Map(categories.map((item) => [item.id, item.name])), [categories]);
  const transactionMap = useMemo(() => new Map(transactions.map((item) => [item.id, item])), [transactions]);

  const selectedTransaction = useMemo(() => {
    if (!form.transaction_id) return null;
    return transactionMap.get(form.transaction_id) ?? null;
  }, [form.transaction_id, transactionMap]);

  const currentAmount = useMemo(() => {
    return form.amount ? Number(form.amount) : 0;
  }, [form.amount]);

  const usedAmount = useMemo(() => {
    if (!form.transaction_id) return 0;
    return rows
      .filter((row) => row.transaction_id === form.transaction_id && row.id !== editingId)
      .reduce((sum, row) => sum + num(row.amount), 0);
  }, [rows, form.transaction_id, editingId]);

  const remainingAmount = useMemo(() => {
    const total = selectedTransaction ? num(selectedTransaction.amount) : 0;
    return total - usedAmount - currentAmount;
  }, [selectedTransaction, usedAmount, currentAmount]);

  const canSubmit =
    form.transaction_id.length > 0 &&
    form.category_id.length > 0 &&
    currentAmount > 0 &&
    remainingAmount >= 0;

  async function loadData() {
    setLoading(true);
    const [splitRes, transactionRes, categoryRes] = await Promise.all([
      supabase.from("transaction_splits").select("id,transaction_id,category_id,amount,note").order("id", { ascending: false }).limit(500),
      supabase.from("transaction_options").select("id,label,amount").order("date", { ascending: false }).limit(200),
      supabase.from("categories").select("id,name").order("sort_order", { ascending: true }).limit(200),
    ]);
    setLoading(false);

    if (splitRes.error || transactionRes.error || categoryRes.error) {
      const message = splitRes.error?.message ?? transactionRes.error?.message ?? categoryRes.error?.message ?? "โหลดข้อมูลไม่สำเร็จ";
      setStatus(`โหลดข้อมูลไม่สำเร็จ: ${message}`);
      return;
    }

    setRows((splitRes.data ?? []) as SplitRow[]);
    setTransactions((transactionRes.data ?? []) as TransactionOption[]);
    setCategories((categoryRes.data ?? []) as CategoryOption[]);
    setStatus(null);
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function setField<K extends keyof SplitForm>(key: K, value: SplitForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function resetForm() {
    setForm(initialForm());
    setEditingId(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canSubmit) {
      setStatus("ยอด split เกินวงเงินของธุรกรรมหลัก หรือกรอกข้อมูลไม่ครบ");
      return;
    }

    setLoading(true);
    const payload = {
      transaction_id: form.transaction_id,
      category_id: form.category_id,
      amount: Number(form.amount),
      note: form.note || null,
    };

    const result = editingId
      ? await supabase.from("transaction_splits").update(payload).eq("id", editingId)
      : await supabase.from("transaction_splits").insert([payload]);

    setLoading(false);
    if (result.error) {
      setStatus(`บันทึก split ไม่สำเร็จ: ${result.error.message}`);
      return;
    }

    setStatus(editingId ? "อัปเดต split เรียบร้อยแล้ว" : "เพิ่ม split เรียบร้อยแล้ว");
    resetForm();
    await loadData();
  }

  function handleEdit(row: SplitRow) {
    setEditingId(row.id);
    setForm({
      transaction_id: row.transaction_id,
      category_id: row.category_id,
      amount: String(num(row.amount)),
      note: row.note ?? "",
    });
    setStatus("โหมดแก้ไข: ปรับจำนวนแล้วดูยอดคงเหลือก่อนบันทึก");
  }

  async function handleDelete(id: string) {
    if (!confirm("ลบ split นี้ใช่หรือไม่?")) return;

    setLoading(true);
    const { error } = await supabase.from("transaction_splits").delete().eq("id", id);
    setLoading(false);
    if (error) {
      setStatus(`ลบ split ไม่สำเร็จ: ${error.message}`);
      return;
    }

    setStatus("ลบ split เรียบร้อยแล้ว");
    await loadData();
  }

  return (
    <main className={styles.card}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Split Transaction</h1>
          <p className={styles.subtitle}>แยกรายการธุรกรรมเป็นหลายหมวดหมู่ พร้อมคำนวณยอดคงเหลือแบบเรียลไทม์</p>
        </div>
        <div className={styles.status}>{status || (loading ? "กำลังโหลด..." : "พร้อมใช้งาน")}</div>
      </div>

      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="transaction_id">ธุรกรรมหลัก</label>
          <select
            id="transaction_id"
            className={styles.select}
            required
            value={form.transaction_id}
            onChange={(event) => setField("transaction_id", event.target.value)}
          >
            <option value="">เลือกธุรกรรม</option>
            {transactions.map((item) => (
              <option key={item.id} value={item.id}>{item.label}</option>
            ))}
          </select>
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="category_id">หมวดหมู่</label>
          <select
            id="category_id"
            className={styles.select}
            required
            value={form.category_id}
            onChange={(event) => setField("category_id", event.target.value)}
          >
            <option value="">เลือกหมวดหมู่</option>
            {categories.map((item) => (
              <option key={item.id} value={item.id}>{item.name}</option>
            ))}
          </select>
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="amount">จำนวนเงิน (ส่วนย่อย)</label>
          <input
            id="amount"
            className={styles.input}
            type="number"
            min="0"
            step="0.01"
            required
            value={form.amount}
            onChange={(event) => setField("amount", event.target.value)}
            placeholder="0"
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="note">หมายเหตุ</label>
          <textarea
            id="note"
            className={styles.input}
            value={form.note}
            onChange={(event) => setField("note", event.target.value)}
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label}>สถานะการคำนวณ</label>
          <div className={styles.status}>
            ยอดธุรกรรมหลัก: {selectedTransaction ? num(selectedTransaction.amount).toLocaleString("th-TH") : "-"} | ใช้ไปแล้ว: {usedAmount.toLocaleString("th-TH")} | หลังบันทึกจะเหลือ: {remainingAmount.toLocaleString("th-TH")}
          </div>
        </div>

        <div className={styles.actions}>
          <button type="submit" className={styles.button} disabled={loading || !canSubmit}>
            {editingId ? "อัปเดต split" : "เพิ่ม split"}
          </button>
          {editingId ? (
            <button type="button" className={styles.cancelButton} onClick={resetForm} disabled={loading}>
              ยกเลิกแก้ไข
            </button>
          ) : null}
        </div>
      </form>

      <table className={styles.table}>
        <thead>
          <tr>
            <th>ธุรกรรมหลัก</th>
            <th>หมวดหมู่</th>
            <th>จำนวนเงิน</th>
            <th>หมายเหตุ</th>
            <th>การกระทำ</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={5} className={styles.status}>ยังไม่มีข้อมูล split</td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={row.id}>
                <td>{transactionMap.get(row.transaction_id)?.label ?? row.transaction_id}</td>
                <td>{categoryMap.get(row.category_id) ?? row.category_id}</td>
                <td>{num(row.amount).toLocaleString("th-TH")}</td>
                <td>{row.note || "-"}</td>
                <td>
                  <button type="button" className={styles.editButton} onClick={() => handleEdit(row)}>
                    แก้ไข
                  </button>
                  <button type="button" className={styles.deleteButton} onClick={() => handleDelete(row.id)}>
                    ลบ
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </main>
  );
}
