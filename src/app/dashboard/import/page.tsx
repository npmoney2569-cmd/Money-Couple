"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import Papa from "papaparse";
import styles from "./import.module.css";
import { Download, UploadCloud, AlertCircle, CheckCircle2 } from "lucide-react";

type Account = { id: string; name: string };
type Category = { id: string; name: string; type: string };

type CsvRow = Record<string, string>;

export default function ImportPage() {
  const supabase = useMemo(() => createClient(), []);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvData, setCsvData] = useState<CsvRow[]>([]);

  // Mapping state
  const [targetAccount, setTargetAccount] = useState<string>("");
  const [dateCol, setDateCol] = useState<string>("");
  const [amountCol, setAmountCol] = useState<string>("");
  const [typeCol, setTypeCol] = useState<string>("");
  const [noteCol, setNoteCol] = useState<string>("");
  const [categoryCol, setCategoryCol] = useState<string>("");

  const [isImporting, setIsImporting] = useState(false);

  useEffect(() => {
    async function loadInitialData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [ { data: accs }, { data: cats } ] = await Promise.all([
        supabase.from("accounts").select("id, name").eq("user_id", user.id),
        supabase.from("categories").select("id, name, type").or(`user_id.eq.${user.id},user_id.is.null`)
      ]);

      setAccounts(accs || []);
      setCategories(cats || []);
      if (accs && accs.length > 0) {
        setTargetAccount(accs[0].id);
      }
      setLoading(false);
    }
    loadInitialData();
  }, [supabase]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setError(null);
    setSuccess(null);

    Papa.parse<CsvRow>(selectedFile, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.meta.fields) {
          setCsvHeaders(results.meta.fields);
          
          // Auto-guess columns
          const headers = results.meta.fields.map(h => h.toLowerCase());
          
          const guess = (keywords: string[]) => {
            const match = results.meta.fields!.find(h => keywords.some(k => h.toLowerCase().includes(k)));
            return match || "";
          };

          setDateCol(guess(["date", "วันที่", "time", "เวลา"]));
          setAmountCol(guess(["amount", "ยอดเงิน", "จำนวนเงิน", "price"]));
          setNoteCol(guess(["note", "memo", "description", "รายละเอียด", "บันทึก"]));
          setTypeCol(guess(["type", "ประเภท"]));
          setCategoryCol(guess(["category", "หมวดหมู่"]));
        }
        setCsvData(results.data);
      },
      error: (err) => {
        setError("ไม่สามารถอ่านไฟล์ CSV ได้: " + err.message);
      }
    });
  };

  const handleImport = async () => {
    if (!targetAccount) {
      setError("กรุณาเลือกบัญชีที่ต้องการนำเข้า");
      return;
    }
    if (!dateCol || !amountCol) {
      setError("กรุณาจับคู่คอลัมน์ วันที่ และ จำนวนเงิน ให้ครบถ้วน");
      return;
    }

    setIsImporting(true);
    setError(null);
    setSuccess(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Unauthorized");

      const recordsToInsert = csvData.map((row) => {
        // Parse Amount
        let rawAmount = row[amountCol] || "0";
        rawAmount = rawAmount.replace(/,/g, "");
        const amount = Math.abs(parseFloat(rawAmount));

        // Parse Type (Try to guess from amount or type column)
        let type = "expense";
        if (typeCol && row[typeCol]) {
          const rawType = row[typeCol].toLowerCase();
          if (rawType.includes("income") || rawType.includes("รายรับ") || rawType.includes("รายได้")) {
            type = "income";
          }
        } else if (parseFloat(rawAmount) > 0) {
          // If no type column, maybe positive = income?
          // Actually, standard banks use negative for expense.
          // Let's assume positive is income if there are negatives.
        }

        // Parse Date (ensure YYYY-MM-DD format)
        let dateStr = row[dateCol];
        let isoDate = new Date().toISOString().split("T")[0];
        try {
            // Very basic date handling, can be improved.
            const d = new Date(dateStr);
            if (!isNaN(d.getTime())) {
                isoDate = d.toISOString().split("T")[0];
            }
        } catch(e) {}

        // Note
        const note = noteCol ? row[noteCol] : "";

        // Category Matching
        let categoryId = null;
        if (categoryCol && row[categoryCol]) {
            const catName = row[categoryCol].toLowerCase();
            const matchedCat = categories.find(c => c.name.toLowerCase() === catName);
            if (matchedCat) {
                categoryId = matchedCat.id;
            }
        }
        if (!categoryId) {
            // fallback
            const fallback = categories.find(c => c.name === (type === "expense" ? "อื่นๆ" : "รายได้อื่น"));
            if (fallback) categoryId = fallback.id;
        }

        return {
          user_id: user.id,
          account_id: targetAccount,
          category_id: categoryId,
          amount,
          type,
          date: isoDate,
          note,
          source: "csv_import"
        };
      });

      if (recordsToInsert.length === 0) {
        throw new Error("ไม่มีข้อมูลที่สามารถนำเข้าได้");
      }

      // Bulk Insert
      const { error: insertError } = await supabase.from("transactions").insert(recordsToInsert);
      if (insertError) throw insertError;

      setSuccess(`นำเข้าข้อมูลสำเร็จ ${recordsToInsert.length} รายการ!`);
      setFile(null);
      setCsvData([]);
      
    } catch (err: any) {
      setError(err.message || "เกิดข้อผิดพลาดในการนำเข้าข้อมูล");
    } finally {
      setIsImporting(false);
    }
  };

  if (loading) return <div className={styles.container}>กำลังโหลดข้อมูล...</div>;

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>นำเข้าข้อมูล (Import)</h1>
      <p className={styles.subtitle}>อัปโหลดไฟล์ Statement จากธนาคารในรูปแบบ CSV เพื่อบันทึกรายรับรายจ่ายอัตโนมัติ</p>

      {error && (
        <div className={styles.errorAlert}>
          <AlertCircle size={18} style={{ display: 'inline', marginRight: 8, verticalAlign: 'middle' }}/>
          {error}
        </div>
      )}

      {success && (
        <div className={styles.alert}>
          <CheckCircle2 size={18} style={{ display: 'inline', marginRight: 8, verticalAlign: 'middle' }}/>
          {success}
        </div>
      )}

      {!file ? (
        <div 
          className={styles.uploadArea} 
          onClick={() => fileInputRef.current?.click()}
        >
          <UploadCloud size={48} className={styles.uploadIcon} />
          <div className={styles.uploadText}>คลิกเพื่ออัปโหลดไฟล์ CSV</div>
          <div className={styles.uploadSubtext}>รองรับไฟล์ .csv เท่านั้น (ขนาดสูงสุด 5MB)</div>
          <input 
            type="file" 
            accept=".csv" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            className={styles.hiddenInput} 
          />
        </div>
      ) : (
        <>
          <div className={styles.card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <div>
                <strong>ไฟล์ที่เลือก: </strong> {file.name} ({csvData.length} แถว)
              </div>
              <button className={styles.secondaryButton} onClick={() => setFile(null)}>เปลี่ยนไฟล์</button>
            </div>

            <div className={styles.settingsRow}>
              <div className={styles.formGroup}>
                <label className={styles.label}>เลือกบัญชีที่จะนำเข้าเข้า</label>
                <select 
                  className={styles.select} 
                  value={targetAccount} 
                  onChange={e => setTargetAccount(e.target.value)}
                >
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>{acc.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <h3 style={{ fontSize: 16, marginBottom: 16 }}>จับคู่คอลัมน์ (Column Mapping)</h3>
            <table className={styles.mappingTable}>
              <thead>
                <tr>
                  <th>ฟิลด์ในระบบ</th>
                  <th>คอลัมน์ในไฟล์ CSV</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>วันที่ (Date) *</td>
                  <td>
                    <select className={styles.select} value={dateCol} onChange={e => setDateCol(e.target.value)}>
                      <option value="">- ข้าม -</option>
                      {csvHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </td>
                </tr>
                <tr>
                  <td>จำนวนเงิน (Amount) *</td>
                  <td>
                    <select className={styles.select} value={amountCol} onChange={e => setAmountCol(e.target.value)}>
                      <option value="">- ข้าม -</option>
                      {csvHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </td>
                </tr>
                <tr>
                  <td>ประเภท (Type)</td>
                  <td>
                    <select className={styles.select} value={typeCol} onChange={e => setTypeCol(e.target.value)}>
                      <option value="">- ข้าม (ใช้รายจ่ายเป็นค่าเริ่มต้น) -</option>
                      {csvHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </td>
                </tr>
                <tr>
                  <td>รายละเอียด (Note)</td>
                  <td>
                    <select className={styles.select} value={noteCol} onChange={e => setNoteCol(e.target.value)}>
                      <option value="">- ข้าม -</option>
                      {csvHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </td>
                </tr>
                <tr>
                  <td>หมวดหมู่ (Category)</td>
                  <td>
                    <select className={styles.select} value={categoryCol} onChange={e => setCategoryCol(e.target.value)}>
                      <option value="">- ข้าม (ใช้อื่นๆ เป็นค่าเริ่มต้น) -</option>
                      {csvHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <h3 style={{ fontSize: 16, marginBottom: 16 }}>ตัวอย่างข้อมูลที่จะถูกนำเข้า (5 แถวแรก)</h3>
          <div className={styles.previewTableWrap}>
            <table className={styles.previewTable}>
              <thead>
                <tr>
                  <th>วันที่</th>
                  <th>ยอดเงิน</th>
                  <th>รายละเอียด</th>
                  <th>ประเภทดิบ</th>
                  <th>หมวดหมู่ดิบ</th>
                </tr>
              </thead>
              <tbody>
                {csvData.slice(0, 5).map((row, i) => (
                  <tr key={i}>
                    <td>{dateCol ? row[dateCol] : '-'}</td>
                    <td>{amountCol ? row[amountCol] : '-'}</td>
                    <td>{noteCol ? row[noteCol] : '-'}</td>
                    <td>{typeCol ? row[typeCol] : '-'}</td>
                    <td>{categoryCol ? row[categoryCol] : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className={styles.actions}>
            <button 
              className={styles.button} 
              onClick={handleImport} 
              disabled={isImporting || !dateCol || !amountCol}
            >
              <Download size={18} />
              {isImporting ? "กำลังนำเข้า..." : "ยืนยันการนำเข้า"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
