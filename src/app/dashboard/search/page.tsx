"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import styles from "./search.module.css";

type TransactionRow = {
  id: string;
  date: string | null;
  type: string | null;
  amount: number | string | null;
  merchant: string | null;
  payee: string | null;
  note: string | null;
  source: string | null;
  category_id: string | null;
  account_id: string | null;
  transaction_tags?: TransactionTagRow[];
};

type CategoryOption = {
  id: string;
  name: string;
  type: string;
};

type AccountOption = {
  id: string;
  name: string;
  is_active: boolean;
};

type TagOption = {
  id: string;
  name: string;
};

type TransactionTagRow = {
  tag_id: string | null;
};

export default function SearchPage() {
  const supabase = useMemo(() => createClient(), []);
  const [query, setQuery] = useState("");
  const [type, setType] = useState("all");
  const [tagId, setTagId] = useState("all");
  const [categoryId, setCategoryId] = useState("all");
  const [accountId, setAccountId] = useState("all");
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [tags, setTags] = useState<TagOption[]>([]);
  const [rows, setRows] = useState<TransactionRow[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const categoryMap = useMemo(() => {
    return new Map(categories.map((item) => [item.id, item.name]));
  }, [categories]);

  const accountMap = useMemo(() => {
    return new Map(accounts.map((item) => [item.id, item.name]));
  }, [accounts]);

  const tagMap = useMemo(() => {
    return new Map(tags.map((item) => [item.id, item.name]));
  }, [tags]);

  const visibleCategories = useMemo(() => {
    if (type === "income" || type === "expense") {
      return categories.filter((item) => item.type === type);
    }
    return categories;
  }, [categories, type]);

  useEffect(() => {
    async function loadFilterOptions() {
      const [categoriesRes, accountsRes, tagsRes] = await Promise.all([
        supabase.from("categories").select("id,name,type").order("sort_order", { ascending: true }),
        supabase.from("accounts").select("id,name,is_active").eq("is_active", true).order("name", { ascending: true }),
        supabase.from("tags").select("id,name").order("name", { ascending: true }),
      ]);

      if (!categoriesRes.error) {
        setCategories((categoriesRes.data ?? []) as CategoryOption[]);
      }
      if (!accountsRes.error) {
        setAccounts((accountsRes.data ?? []) as AccountOption[]);
      }
      if (!tagsRes.error) {
        setTags((tagsRes.data ?? []) as TagOption[]);
      }
    }

    loadFilterOptions();
  }, [supabase]);

  const loadTransactions = useCallback(async () => {
    setLoading(true);
    setStatus(null);

    const searchText = query.trim();

    let tagFilteredIds: string[] | null = null;
    if (tagId !== "all") {
      const { data: tagRows, error: tagError } = await supabase
        .from("transaction_tags")
        .select("transaction_id")
        .eq("tag_id", tagId)
        .limit(2000);

      if (tagError) {
        setLoading(false);
        setStatus(`ค้นหาจากแท็กไม่สำเร็จ: ${tagError.message}`);
        setRows([]);
        return;
      }

      tagFilteredIds = (tagRows ?? [])
        .map((item) => String((item as { transaction_id?: unknown }).transaction_id ?? ""))
        .filter((id) => id.length > 0);

      if (tagFilteredIds.length === 0) {
        setLoading(false);
        setRows([]);
        setStatus("ไม่พบผลลัพธ์");
        return;
      }
    }

    let request = supabase
      .from("transactions")
      .select(
        "id,date,type,amount,merchant,payee,note,source,category_id,account_id,transaction_tags(tag_id)"
      )
      .is("deleted_at", null);

    if (tagFilteredIds) {
      request = request.in("id", tagFilteredIds);
    }

    if (type !== "all") {
      request = request.eq("type", type);
    }

    if (categoryId !== "all") {
      request = request.eq("category_id", categoryId);
    }

    if (accountId !== "all") {
      request = request.eq("account_id", accountId);
    }

    if (startDate) {
      request = request.gte("date", startDate);
    }
    if (endDate) {
      request = request.lte("date", endDate);
    }

    if (minAmount) {
      request = request.gte("amount", Number(minAmount));
    }

    if (maxAmount) {
      request = request.lte("amount", Number(maxAmount));
    }

    if (searchText) {
      request = request.or(
        `merchant.ilike.%${searchText}%,payee.ilike.%${searchText}%,note.ilike.%${searchText}%,source.ilike.%${searchText}%`
      );
    }

    const { data, error } = await request.order("date", { ascending: false }).limit(200);
    setLoading(false);

    if (error) {
      setStatus(`ค้นหาไม่สำเร็จ: ${error.message}`);
      setRows([]);
      return;
    }

    setRows((data ?? []) as TransactionRow[]);
    setStatus((data?.length ?? 0) === 0 ? "ไม่พบผลลัพธ์" : null);
  }, [supabase, query, type, tagId, categoryId, accountId, minAmount, maxAmount, startDate, endDate]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  function escapeCsv(value: string) {
    if (value.includes(",") || value.includes("\n") || value.includes("\"")) {
      return `"${value.replaceAll("\"", "\"\"")}"`;
    }
    return value;
  }

  function handleExportCsv() {
    if (rows.length === 0) {
      setStatus("ยังไม่มีข้อมูลสำหรับ export");
      return;
    }

    const header = ["date", "type", "amount", "merchant_or_payee", "category", "account", "tags", "source", "note"];
    const lines = rows.map((row) => {
      const category = row.category_id ? (categoryMap.get(row.category_id) ?? row.category_id) : "";
      const account = row.account_id ? (accountMap.get(row.account_id) ?? row.account_id) : "";
      const tagsText = row.transaction_tags && row.transaction_tags.length > 0
        ? row.transaction_tags
            .map((item) => (item.tag_id ? (tagMap.get(item.tag_id) ?? item.tag_id) : ""))
            .filter((text) => text.length > 0)
            .join("|")
        : "";

      return [
        row.date ?? "",
        row.type ?? "",
        row.amount !== null && row.amount !== undefined ? String(row.amount) : "",
        row.merchant ?? row.payee ?? "",
        category,
        account,
        tagsText,
        row.source ?? "",
        row.note ?? "",
      ].map((cell) => escapeCsv(String(cell))).join(",");
    });

    const csv = [header.join(","), ...lines].join("\n");
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const datePart = new Date().toISOString().slice(0, 10);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `search-transactions-${datePart}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
    setStatus(`export CSV สำเร็จ (${rows.length} รายการ)`);
  }

  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <h1>ค้นหา / กรอง</h1>
        <p>ค้นหาข้อมูลในตาราง transactions โดย merchant, payee, note หรือ source</p>

        <form className={styles.searchForm} onSubmit={(event) => { event.preventDefault(); loadTransactions(); }}>
          <input
            className={styles.input}
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="ค้นหา merchant, payee, note, source"
          />

          <div className={styles.filterRow}>
            <label>
              <span>ประเภท</span>
              <select value={type} onChange={(event) => setType(event.target.value)} className={styles.select}>
                <option value="all">ทั้งหมด</option>
                <option value="income">รายรับ</option>
                <option value="expense">รายจ่าย</option>
                <option value="transfer">โอนเงิน</option>
              </select>
            </label>
            <label>
              <span>แท็ก</span>
              <select value={tagId} onChange={(event) => setTagId(event.target.value)} className={styles.select}>
                <option value="all">ทุกแท็ก</option>
                {tags.map((item) => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
              </select>
            </label>
            <label>
              <span>หมวดหมู่</span>
              <select value={categoryId} onChange={(event) => setCategoryId(event.target.value)} className={styles.select}>
                <option value="all">ทุกหมวดหมู่</option>
                {visibleCategories.map((item) => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
              </select>
            </label>
            <label>
              <span>บัญชี</span>
              <select value={accountId} onChange={(event) => setAccountId(event.target.value)} className={styles.select}>
                <option value="all">ทุกบัญชี</option>
                {accounts.map((item) => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
              </select>
            </label>
            <label>
              <span>ยอดขั้นต่ำ</span>
              <input
                className={styles.input}
                type="number"
                value={minAmount}
                onChange={(event) => setMinAmount(event.target.value)}
                placeholder="0"
              />
            </label>
            <label>
              <span>ยอดสูงสุด</span>
              <input
                className={styles.input}
                type="number"
                value={maxAmount}
                onChange={(event) => setMaxAmount(event.target.value)}
                placeholder="ไม่จำกัด"
              />
            </label>
            <label>
              <span>ตั้งแต่</span>
              <input
                className={styles.input}
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
              />
            </label>
            <label>
              <span>ถึง</span>
              <input
                className={styles.input}
                type="date"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
              />
            </label>
            <button type="submit" className={styles.button} disabled={loading}>
              ค้นหา
            </button>
            <button type="button" className={styles.buttonSecondary} onClick={handleExportCsv} disabled={loading || rows.length === 0}>
              Export CSV
            </button>
          </div>
        </form>

        {status ? <p className={styles.status}>{status}</p> : null}

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>วันที่</th>
                <th>ประเภท</th>
                <th>จำนวนเงิน</th>
                <th>ร้านค้า / ผู้รับเงิน</th>
                <th>หมวดหมู่</th>
                <th>บัญชี</th>
                <th>แท็ก</th>
                <th>source</th>
                <th>โน้ต</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={9}>{loading ? "กำลังค้นหา..." : "ยังไม่มีผลลัพธ์"}</td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={String(row.id)}>
                    <td>{row.date ?? "-"}</td>
                    <td>{row.type ?? "-"}</td>
                    <td>{typeof row.amount === "number" ? row.amount.toLocaleString("th-TH") : row.amount ?? "-"}</td>
                    <td>{row.merchant ?? row.payee ?? "-"}</td>
                    <td>{row.category_id ? (categoryMap.get(row.category_id) ?? row.category_id) : "-"}</td>
                    <td>{row.account_id ? (accountMap.get(row.account_id) ?? row.account_id) : "-"}</td>
                    <td>
                      {row.transaction_tags && row.transaction_tags.length > 0
                        ? row.transaction_tags
                            .map((item) => (item.tag_id ? (tagMap.get(item.tag_id) ?? item.tag_id) : ""))
                            .filter((text) => text.length > 0)
                            .join(", ")
                        : "-"}
                    </td>
                    <td>{row.source ?? "-"}</td>
                    <td>{row.note ?? "-"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
