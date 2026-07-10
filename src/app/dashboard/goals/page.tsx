"use client";

import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import styles from "./goals.module.css";

type Account = {
  id: string;
  name: string;
  balance: number;
};

type Goal = {
  id: string;
  name: string;
  target_amount: number;
  target_date: string | null;
  icon: string | null;
  account_id: string | null;
  couple_id: string | null;
  accounts?: Account | null; // Joined account for balance
};

export default function GoalsPage() {
  const supabase = useMemo(() => createClient(), []);
  
  const [goals, setGoals] = useState<Goal[]>([]);
  const [activeAccounts, setActiveAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Couple support state
  const [coupleId, setCoupleId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"personal" | "couple">("personal");

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [txType, setTxType] = useState<"deposit" | "withdraw">("deposit");
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);

  // Create Goal Form state
  const [createForm, setCreateForm] = useState({
    name: "",
    target_amount: "",
    target_date: "",
    icon: "🎯"
  });

  // Tx Form state
  const [txForm, setTxForm] = useState({
    amount: "",
    account_id: "", // The other account to transfer to/from
    note: ""
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check couple link on load
  useEffect(() => {
    async function checkCouple() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const { data } = await supabase
        .from("couple_members")
        .select("couple_id")
        .eq("user_id", user.id)
        .maybeSingle();
      
      if (data) {
        setCoupleId(data.couple_id);
      }
    }
    checkCouple();
  }, [supabase]);

  async function loadData() {
    setLoading(true);
    setError(null);
    
    // Fetch goals
    let goalsQuery = supabase
      .from("goals")
      .select("*, accounts(id, name, balance)")
      .order("created_at", { ascending: false });

    // Filter based on active tab
    if (coupleId && activeTab === "couple") {
      goalsQuery = goalsQuery.eq("couple_id", coupleId);
    } else {
      goalsQuery = goalsQuery.is("couple_id", null);
    }

    const { data: goalsData, error: goalsError } = await goalsQuery;

    if (goalsError) {
      setError(goalsError.message);
    } else {
      setGoals(goalsData as unknown as Goal[]);
    }

    // Fetch active accounts for transfer source/destination (includes personal and shared)
    const { data: accountsData } = await supabase
      .from("accounts")
      .select("id, name, balance")
      .eq("is_active", true)
      .neq("type", "savings") // exclude savings from general accounts dropdown
      .order("name");
      
    if (accountsData) {
      setActiveAccounts(accountsData);
      if (accountsData.length > 0) {
        setTxForm(prev => ({ ...prev, account_id: accountsData[0].id }));
      }
    }
    
    setLoading(false);
  }

  // Reload when activeTab or coupleId changes
  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, coupleId]);

  async function handleCreateGoal(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const isShared = coupleId && activeTab === "couple";

    try {
      // 1. Create Savings Account
      const { data: accData, error: accError } = await supabase
        .from("accounts")
        .insert([{
          name: `${isShared ? "💖 " : "🎯 "}ออม: ${createForm.name}`,
          type: "savings",
          initial_balance: 0,
          balance: 0,
          is_active: true,
          couple_id: isShared ? coupleId : null // set couple_id if shared savings
        }])
        .select("id")
        .single();

      if (accError) throw accError;

      // 2. Create Goal
      const { error: goalError } = await supabase
        .from("goals")
        .insert([{
          name: createForm.name,
          target_amount: Number(createForm.target_amount),
          target_date: createForm.target_date || null,
          icon: createForm.icon || "🎯",
          account_id: accData.id,
          couple_id: isShared ? coupleId : null // link to couple
        }]);

      if (goalError) throw goalError;

      // Success
      setIsCreateModalOpen(false);
      setCreateForm({ name: "", target_amount: "", target_date: "", icon: "🎯" });
      await loadData();
    } catch (err: any) {
      setError(err.message || "เกิดข้อผิดพลาดในการสร้างเป้าหมาย");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleTransaction(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedGoal || !selectedGoal.account_id) return;
    
    setIsSubmitting(true);
    setError(null);

    const amountNum = Number(txForm.amount);
    
    // Determine transfer direction
    const fromAccount = txType === "deposit" ? txForm.account_id : selectedGoal.account_id;
    const toAccount = txType === "deposit" ? selectedGoal.account_id : txForm.account_id;

    try {
      const { error: txError } = await supabase
        .from("transactions")
        .insert([{
          type: "transfer",
          amount: amountNum,
          date: new Date().toISOString().split("T")[0],
          account_id: fromAccount,
          to_account_id: toAccount,
          note: txForm.note || (txType === "deposit" ? `ออมเงินเข้าเป้าหมาย: ${selectedGoal.name}` : `ถอนเงินจากเป้าหมาย: ${selectedGoal.name}`),
          source: "app"
        }]);

      if (txError) throw txError;

      // We also need to log this in goal_transactions
      await supabase.from("goal_transactions").insert([{
        goal_id: selectedGoal.id,
        amount: txType === "deposit" ? amountNum : -amountNum,
        note: txForm.note || (txType === "deposit" ? "ฝากเงิน" : "ถอนเงิน")
      }]);

      setIsTxModalOpen(false);
      setTxForm(prev => ({ ...prev, amount: "", note: "" }));
      await loadData();
    } catch (err: any) {
      setError(err.message || "เกิดข้อผิดพลาดในการทำรายการ");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeleteGoal(id: string, account_id: string | null) {
    if (!confirm("คุณต้องการลบเป้าหมายนี้ใช่หรือไม่? (บัญชีออมเงินที่เกี่ยวข้องจะถูกเก็บไว้เป็นบัญชีปกติ)")) return;
    
    setLoading(true);
    
    const { error: delError } = await supabase.from("goals").delete().eq("id", id);
    
    if (delError) {
      setError(delError.message);
      setLoading(false);
    } else {
      await loadData();
    }
  }

  function openTxModal(goal: Goal, type: "deposit" | "withdraw") {
    setSelectedGoal(goal);
    setTxType(type);
    setIsTxModalOpen(true);
  }

  function formatCurrency(val: number) {
    return new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB" }).format(val);
  }

  return (
    <main className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>เป้าหมายการออม</h1>
          <p className={styles.subtitle}>ระบบเป้าหมายผูกบัญชีออมอัตโนมัติ (ฝาก/ถอนผ่าน Transfer)</p>
        </div>
        <button className={styles.createButton} onClick={() => setIsCreateModalOpen(true)}>
          + สร้างเป้าหมายใหม่
        </button>
      </div>

      {coupleId && (
        <div style={{
          display: "flex",
          background: "rgba(15, 32, 67, 0.4)",
          padding: "6px",
          borderRadius: "12px",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          width: "fit-content",
          alignSelf: "center",
          marginBottom: "20px"
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
            👤 เป้าหมายส่วนตัว
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
            💖 เป้าหมายร่วม (คู่รัก)
          </button>
        </div>
      )}

      {error && <div style={{ color: '#ff6580', marginBottom: '1rem', padding: '1rem', background: 'rgba(255,101,128,0.1)', borderRadius: '8px' }}>{error}</div>}

      {loading ? (
        <p style={{ color: '#8b92a5', textAlign: 'center' }}>กำลังโหลด...</p>
      ) : (
        <div className={styles.grid}>
          {goals.length === 0 ? (
            <div className={styles.emptyState}>
              {activeTab === "couple" 
                ? "ยังไม่มีเป้าหมายร่วมกัน ลองสร้างเป้าหมายคู่รักเป้าแรกดูสิ!" 
                : "ยังไม่มีเป้าหมายการออม ลองสร้างเป้าหมายแรกของคุณดูสิ!"}
            </div>
          ) : (
            goals.map((goal) => {
              const currentAmount = goal.accounts?.balance || 0;
              const percent = Math.min(100, Math.max(0, (currentAmount / goal.target_amount) * 100));
              
              return (
                <div key={goal.id} className={styles.card}>
                  <button className={styles.deleteBtn} onClick={() => handleDeleteGoal(goal.id, goal.account_id)} title="ลบเป้าหมาย">
                    ✕
                  </button>
                  <div className={styles.cardHeader}>
                    <div className={styles.icon}>{goal.icon || "🎯"}</div>
                    <div>
                      <h2 className={styles.cardTitle}>{goal.name}</h2>
                      {goal.target_date && (
                        <p className={styles.cardDate}>เป้าหมาย: {new Date(goal.target_date).toLocaleDateString('th-TH')}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className={styles.progressWrap}>
                    <div className={styles.amounts}>
                      <span className={styles.current}>{formatCurrency(currentAmount)}</span>
                      <span className={styles.target}>{formatCurrency(goal.target_amount)}</span>
                    </div>
                    <div className={styles.progressBar}>
                      <div className={styles.progressFill} style={{ width: `${percent}%` }} />
                    </div>
                    <div style={{ textAlign: 'right', fontSize: '0.75rem', color: '#8b92a5', marginTop: '0.25rem' }}>
                      {percent.toFixed(1)}%
                    </div>
                  </div>

                  <div className={styles.actions}>
                    <button 
                      className={`${styles.actionBtn} ${styles.deposit}`}
                      onClick={() => openTxModal(goal, "deposit")}
                    >
                      ฝากเงิน
                    </button>
                    <button 
                      className={`${styles.actionBtn} ${styles.withdraw}`}
                      onClick={() => openTxModal(goal, "withdraw")}
                      disabled={currentAmount <= 0}
                      style={{ opacity: currentAmount <= 0 ? 0.5 : 1 }}
                    >
                      ถอนเงิน
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}

      {/* Create Modal */}
      {isCreateModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h2>{activeTab === "couple" ? "สร้างเป้าหมายร่วม (คู่รัก)" : "สร้างเป้าหมายการออม"}</h2>
            <form onSubmit={handleCreateGoal}>
              <div className={styles.formGroup}>
                <label>ชื่อเป้าหมาย</label>
                <input 
                  type="text" 
                  className={styles.input} 
                  required 
                  placeholder="เช่น ซื้อรถ, ท่องเที่ยว"
                  value={createForm.name}
                  onChange={e => setCreateForm(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div className={styles.formGroup}>
                <label>เป้าหมายเงิน (บาท)</label>
                <input 
                  type="number" 
                  className={styles.input} 
                  required 
                  min="1"
                  placeholder="เช่น 100000"
                  value={createForm.target_amount}
                  onChange={e => setCreateForm(prev => ({ ...prev, target_amount: e.target.value }))}
                />
              </div>
              <div className={styles.formGroup}>
                <label>วันที่เป้าหมาย (ตัวเลือก)</label>
                <input 
                  type="date" 
                  className={styles.input} 
                  value={createForm.target_date}
                  onChange={e => setCreateForm(prev => ({ ...prev, target_date: e.target.value }))}
                />
              </div>
              <div className={styles.formGroup}>
                <label>ไอคอน (ตัวเลือก)</label>
                <input 
                  type="text" 
                  className={styles.input} 
                  placeholder="เช่น 🎯, 🚗, ✈️"
                  value={createForm.icon}
                  onChange={e => setCreateForm(prev => ({ ...prev, icon: e.target.value }))}
                />
              </div>
              <div className={styles.modalActions}>
                <button type="button" className={styles.btnCancel} onClick={() => setIsCreateModalOpen(false)}>
                  ยกเลิก
                </button>
                <button type="submit" className={styles.btnSubmit} disabled={isSubmitting}>
                  {isSubmitting ? "กำลังบันทึก..." : "สร้างเป้าหมาย"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Transaction Modal */}
      {isTxModalOpen && selectedGoal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h2>{txType === "deposit" ? "ฝากเงินเข้า" : "ถอนเงินจาก"} {selectedGoal.name}</h2>
            <form onSubmit={handleTransaction}>
              <div className={styles.formGroup}>
                <label>{txType === "deposit" ? "โอนจากบัญชี" : "โอนเข้าบัญชี"}</label>
                <select 
                  className={styles.select} 
                  required
                  value={txForm.account_id}
                  onChange={e => setTxForm(prev => ({ ...prev, account_id: e.target.value }))}
                >
                  {activeAccounts.length === 0 ? (
                    <option value="">ไม่มีบัญชีอื่น (กรุณาสร้างบัญชีก่อน)</option>
                  ) : (
                    activeAccounts.map(acc => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} ({formatCurrency(acc.balance)})
                      </option>
                    ))
                  )}
                </select>
              </div>
              <div className={styles.formGroup}>
                <label>จำนวนเงิน</label>
                <input 
                  type="number" 
                  className={styles.input} 
                  required 
                  min="1"
                  max={txType === "withdraw" ? selectedGoal.accounts?.balance : undefined}
                  value={txForm.amount}
                  onChange={e => setTxForm(prev => ({ ...prev, amount: e.target.value }))}
                />
              </div>
              <div className={styles.formGroup}>
                <label>โน้ต (ตัวเลือก)</label>
                <input 
                  type="text" 
                  className={styles.input} 
                  value={txForm.note}
                  onChange={e => setTxForm(prev => ({ ...prev, note: e.target.value }))}
                />
              </div>
              <div className={styles.modalActions}>
                <button type="button" className={styles.btnCancel} onClick={() => setIsTxModalOpen(false)}>
                  ยกเลิก
                </button>
                <button 
                  type="submit" 
                  className={styles.btnSubmit} 
                  disabled={isSubmitting || activeAccounts.length === 0}
                  style={txType === "withdraw" ? { background: '#ff6580' } : { background: '#2ee3a8', color: '#000' }}
                >
                  {isSubmitting ? "กำลังดำเนินการ..." : "ยืนยัน"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
