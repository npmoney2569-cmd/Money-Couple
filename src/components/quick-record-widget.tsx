"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ArrowDown, ArrowUp, ArrowLeftRight, Camera, X } from "lucide-react";
import styles from "./quick-record-widget.module.css";

type Account = {
  id: string;
  name: string;
  type?: string;
  balance: number | string;
};

type Category = {
  id: string;
  name: string;
  type: string;
};

type Props = {
  accounts: Account[];
  categories: Category[];
};

type ModalType = "income" | "expense" | "transfer" | "scan" | null;

export default function QuickRecordWidget({ accounts, categories }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [modal, setModal] = useState<ModalType>(null);
  const [isPending, startTransition] = useTransition();

  // Form states
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [accountId, setAccountId] = useState("");
  const [toAccountId, setToAccountId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [note, setNote] = useState("");
  const [merchant, setMerchant] = useState("");
  const [payee, setPayee] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // File Upload states (for receipt scan simulation)
  const [file, setFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);

  function resetForm() {
    setAmount("");
    setDate(new Date().toISOString().slice(0, 10));
    setAccountId(accounts[0]?.id || "");
    setToAccountId(accounts[1]?.id || accounts[0]?.id || "");
    setCategoryId("");
    setNote("");
    setMerchant("");
    setPayee("");
    setStatus(null);
    setFile(null);
    setUploadProgress(null);
  }

  function openModal(type: ModalType) {
    setModal(type);
    resetForm();
    if (type === "income") {
      const firstIncomeCat = categories.find(c => c.type === "income");
      if (firstIncomeCat) setCategoryId(firstIncomeCat.id);
    } else if (type === "expense") {
      const firstExpenseCat = categories.find(c => c.type === "expense");
      if (firstExpenseCat) setCategoryId(firstExpenseCat.id);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) {
      setStatus("กรุณากรอกจำนวนเงินให้ถูกต้อง");
      return;
    }
    if (!accountId) {
      setStatus("กรุณาเลือกบัญชี");
      return;
    }

    setLoading(true);
    setStatus(null);

    try {
      // Get current authenticated user ID
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error("กรุณาเข้าสู่ระบบก่อนดำเนินการ");
      }

      if (modal === "income" || modal === "expense") {
        const payload: any = {
          user_id: user.id,
          type: modal,
          amount: parseFloat(amount),
          date,
          account_id: accountId,
          category_id: categoryId || null,
          note: note.trim() || null,
          source: "app",
        };

        if (modal === "income" && payee.trim()) {
          payload.payee = payee.trim();
        } else if (modal === "expense" && merchant.trim()) {
          payload.merchant = merchant.trim();
        }

        const { error } = await supabase.from("transactions").insert(payload);
        if (error) throw error;

      } else if (modal === "transfer") {
        if (accountId === toAccountId) {
          throw new Error("บัญชีต้นทางและปลายทางห้ามเป็นบัญชีเดียวกัน");
        }

        const payload = {
          user_id: user.id,
          type: "transfer",
          amount: parseFloat(amount),
          date,
          account_id: accountId,
          to_account_id: toAccountId,
          note: note.trim() || null,
          source: "app",
        };

        const { error } = await supabase.from("transactions").insert(payload);
        if (error) throw error;
      }

      // Refresh page and close modal
      startTransition(() => {
        router.refresh();
      });
      setModal(null);
    } catch (err: any) {
      setStatus(err.message || "เกิดข้อผิดพลาดในการบันทึกข้อมูล");
    } finally {
      setLoading(false);
    }
  }

  // Handle receipt upload & auto expense form
  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setUploadProgress("กำลังจำลองระบบสแกนใบเสร็จ OCR...");
    
    // Simulate OCR analysis
    setTimeout(() => {
      // Prefill fields with random realistic receipt values
      const simulatedAmounts = [120, 350, 480, 1250, 89];
      const randomAmount = simulatedAmounts[Math.floor(Math.random() * simulatedAmounts.length)];
      
      const simulatedMerchants = ["7-Eleven", "Lotus's Express", "ปั๊ม ปตท.", "ร้านข้าวมันไก่กิ๊กก๊อก", "GrabFood"];
      const randomMerchant = simulatedMerchants[Math.floor(Math.random() * simulatedMerchants.length)];
      
      setAmount(String(randomAmount));
      setMerchant(randomMerchant);
      setNote("บันทึกอัตโนมัติจากรูปใบเสร็จ");
      
      // Auto switch to expense form but with file context
      setModal("expense");
      const firstExpenseCat = categories.find(c => c.type === "expense");
      if (firstExpenseCat) setCategoryId(firstExpenseCat.id);
      setUploadProgress(null);
      setStatus("สแกนใบเสร็จสำเร็จ! กรุณาตรวจสอบข้อมูลและกดยืนยันเพื่อบันทึก");
    }, 1500);
  }

  return (
    <>
      <article className={styles.card}>
        <h2 className={styles.sectionTitle}>บันทึกรายการด่วน</h2>
        <div className={styles.grid}>
          {/* Income Button */}
          <button 
            type="button" 
            className={`${styles.btn} ${styles.green}`} 
            onClick={() => openModal("income")}
          >
            <div className={styles.iconBox}>
              <ArrowDown size={22} />
            </div>
            <span className={styles.btnText}>รายรับ</span>
          </button>

          {/* Expense Button */}
          <button 
            type="button" 
            className={`${styles.btn} ${styles.red}`} 
            onClick={() => openModal("expense")}
          >
            <div className={styles.iconBox}>
              <ArrowUp size={22} />
            </div>
            <span className={styles.btnText}>รายจ่าย</span>
          </button>

          {/* Transfer Button */}
          <button 
            type="button" 
            className={`${styles.btn} ${styles.blue}`} 
            onClick={() => openModal("transfer")}
          >
            <div className={styles.iconBox}>
              <ArrowLeftRight size={22} />
            </div>
            <span className={styles.btnText}>โอนเงิน</span>
          </button>

          {/* Scan Receipt Button */}
          <label className={`${styles.btn} ${styles.purple} ${styles.fileLabel}`}>
            <input 
              type="file" 
              accept="image/*" 
              className={styles.hiddenInput} 
              onChange={handleFileChange}
              disabled={loading || isPending}
            />
            <div className={styles.iconBox}>
              <Camera size={22} />
            </div>
            <span className={styles.btnText}>สแกนใบเสร็จ</span>
          </label>
        </div>

        {uploadProgress && (
          <div className={styles.uploadAlert}>
            <div className={styles.spinnerSmall} />
            <span>{uploadProgress}</span>
          </div>
        )}
      </article>

      {/* Modal Overlay */}
      {modal && modal !== "scan" && (
        <div className={styles.overlay} onClick={() => setModal(null)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>
                {modal === "income" && "บันทึกรายรับด่วน"}
                {modal === "expense" && "บันทึกรายจ่ายด่วน"}
                {modal === "transfer" && "โอนเงินด่วน"}
              </h3>
              <button type="button" className={styles.closeBtn} onClick={() => setModal(null)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreate} className={styles.form}>
              {status && (
                <div className={`${styles.status} ${status.includes("สำเร็จ") ? styles.statusSuccess : styles.statusError}`}>
                  {status}
                </div>
              )}

              {/* Amount field */}
              <label className={styles.label}>
                <span className={styles.labelText}>จำนวนเงิน (บาท) *</span>
                <input
                  type="number"
                  step="any"
                  required
                  autoFocus
                  placeholder="0.00"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  className={styles.input}
                />
              </label>

              {/* Date field */}
              <label className={styles.label}>
                <span className={styles.labelText}>วันที่ *</span>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className={styles.input}
                />
              </label>

              {/* Accounts selector */}
              {modal === "transfer" ? (
                <div className={styles.row}>
                  <label className={styles.label}>
                    <span className={styles.labelText}>จากบัญชี *</span>
                    <select
                      value={accountId}
                      onChange={e => setAccountId(e.target.value)}
                      className={styles.select}
                    >
                      {accounts.map(acc => (
                        <option key={acc.id} value={acc.id}>
                          {acc.name} (฿{parseFloat(String(acc.balance)).toLocaleString()})
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className={styles.label}>
                    <span className={styles.labelText}>ไปยังบัญชี *</span>
                    <select
                      value={toAccountId}
                      onChange={e => setToAccountId(e.target.value)}
                      className={styles.select}
                    >
                      {accounts.map(acc => (
                        <option key={acc.id} value={acc.id}>
                          {acc.name} (฿{parseFloat(String(acc.balance)).toLocaleString()})
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              ) : (
                <label className={styles.label}>
                  <span className={styles.labelText}>บัญชี *</span>
                  <select
                    value={accountId}
                    onChange={e => setAccountId(e.target.value)}
                    className={styles.select}
                  >
                    {accounts.map(acc => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} (฿{parseFloat(String(acc.balance)).toLocaleString()})
                      </option>
                    ))}
                  </select>
                </label>
              )}

              {/* Category selector */}
              {modal !== "transfer" && (
                <label className={styles.label}>
                  <span className={styles.labelText}>หมวดหมู่ *</span>
                  <select
                    value={categoryId}
                    onChange={e => setCategoryId(e.target.value)}
                    className={styles.select}
                  >
                    {categories
                      .filter(c => c.type === modal)
                      .map(cat => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                  </select>
                </label>
              )}

              {/* Payee / Merchant field */}
              {modal === "income" && (
                <label className={styles.label}>
                  <span className={styles.labelText}>ผู้จ่าย</span>
                  <input
                    type="text"
                    placeholder="เช่น เงินเดือนบริษัท, นายเอ"
                    value={payee}
                    onChange={e => setPayee(e.target.value)}
                    className={styles.input}
                  />
                </label>
              )}

              {modal === "expense" && (
                <label className={styles.label}>
                  <span className={styles.labelText}>ร้านค้า / บริการ</span>
                  <input
                    type="text"
                    placeholder="เช่น 7-Eleven, เซ็นทรัล"
                    value={merchant}
                    onChange={e => setMerchant(e.target.value)}
                    className={styles.input}
                  />
                </label>
              )}

              {/* Note field */}
              <label className={styles.label}>
                <span className={styles.labelText}>บันทึกเพิ่มเติม</span>
                <input
                  type="text"
                  placeholder="โน้ตสั้นๆ เตือนความจำ"
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  className={styles.input}
                />
              </label>

              {file && (
                <div className={styles.fileAttached}>
                  📎 แนบไฟล์สำเร็จ: {file.name}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || isPending}
                className={styles.submitBtn}
              >
                {loading || isPending ? "กำลังบันทึก..." : "ยืนยันการบันทึก"}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
