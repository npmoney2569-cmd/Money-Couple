"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import styles from "./couple.module.css";
import { Heart, Users, Split, ArrowLeftRight, BarChart3, LayoutDashboard, User, Wallet } from "lucide-react";

type UserProfile = {
  id: string;
  display_name: string;
  email: string;
  avatar_url: string | null;
};

type CoupleMember = {
  couple_id: string;
  user_id: string;
  role: string;
  users: UserProfile;
};

type Invite = {
  id: string;
  from_user_id: string;
  to_email: string;
  status: string;
  created_at: string;
  users?: UserProfile; // Joined sender profile (for received invites)
};

type Transaction = {
  id: string;
  user_id: string;
  amount: number;
  type: string;
  date: string;
  note: string | null;
  categories: { name: string } | null;
  accounts?: { couple_id: string | null } | null;
};

type SplitDetail = {
  user_id: string;
  amount: number;
  share_value: number;
};

type CoupleSplit = {
  id: string;
  transaction_id: string;
  couple_id: string;
  split_type: string;
  details: SplitDetail[];
  created_at: string;
  transactions: Transaction;
};

type Settlement = {
  id: string;
  couple_id: string;
  from_user_id: string;
  to_user_id: string;
  amount: number;
  date: string;
  note: string | null;
};

export default function CoupleHubPage() {
  const supabase = useMemo(() => createClient(), []);
  
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [coupleId, setCoupleId] = useState<string | null>(null);
  const [partner, setPartner] = useState<UserProfile | null>(null);
  const [members, setMembers] = useState<CoupleMember[]>([]);
  const [activeTab, setActiveTab] = useState<"dashboard" | "relationship" | "splits" | "reports">("dashboard");

  // State for setups
  const [inviteEmail, setInviteEmail] = useState("");
  const [sentInvites, setSentInvites] = useState<Invite[]>([]);
  const [receivedInvites, setReceivedInvites] = useState<Invite[]>([]);

  // State for splits & transactions
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [splits, setSplits] = useState<CoupleSplit[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  
  // Modals / forms state
  const [isSplitModalOpen, setIsSplitModalOpen] = useState(false);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [splitType, setSplitType] = useState<"equal" | "percentage">("equal");
  const [customPercentage, setCustomPercentage] = useState("50"); // Percentage for current user
  
  const [isSettleModalOpen, setIsSettleModalOpen] = useState(false);
  const [settleAmount, setSettleAmount] = useState("");
  const [settleNote, setSettleNote] = useState("");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  // Initialize and load core data
  async function loadCoreData() {
    setLoading(true);
    setStatus(null);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    // Fetch user profile
    const { data: profile } = await supabase
      .from("users")
      .select("*")
      .eq("id", user.id)
      .single();

    if (profile) {
      setCurrentUser(profile as UserProfile);
    }

    // Fetch relationship members
    const { data: memberRows } = await supabase
      .from("couple_members")
      .select("couple_id, user_id, role, users(id, display_name, email, avatar_url)");

    if (memberRows && memberRows.length > 0) {
      setMembers(memberRows as unknown as CoupleMember[]);
      const currentMember = memberRows.find(m => m.user_id === user.id);
      if (currentMember) {
        setCoupleId(currentMember.couple_id);
        const otherMember = memberRows.find(m => m.couple_id === currentMember.couple_id && m.user_id !== user.id);
        if (otherMember) {
          setPartner(otherMember.users as unknown as UserProfile);
        }
      }
    } else {
      // Clear states if not coupled
      setCoupleId(null);
      setPartner(null);
      setMembers([]);
    }

    // Fetch invites (if not coupled)
    if (!memberRows || memberRows.length === 0) {
      // Sent invites
      const { data: sent } = await supabase
        .from("relationship_invites")
        .select("*")
        .eq("from_user_id", user.id)
        .eq("status", "pending");
      setSentInvites((sent || []) as Invite[]);

      // Received invites
      if (profile?.email) {
        const { data: received } = await supabase
          .from("relationship_invites")
          .select("*, users:from_user_id(id, display_name, email, avatar_url)")
          .eq("to_email", profile.email.toLowerCase())
          .eq("status", "pending");
        setReceivedInvites((received || []) as unknown as Invite[]);
      }
    }

    setLoading(false);
  }

  // Load finance data (splits, transactions, settlements) if coupled
  async function loadFinanceData() {
    if (!coupleId || !currentUser || !partner) return;

    // Fetch transactions of both users (only expenses/income, skip transfers)
    const { data: txsData } = await supabase
      .from("transactions")
      .select("*, categories(name), accounts!account_id(couple_id)")
      .in("user_id", [currentUser.id, partner.id])
      .neq("type", "transfer")
      .is("deleted_at", null)
      .order("date", { ascending: false })
      .limit(100);

    setTransactions((txsData || []) as unknown as Transaction[]);

    // Fetch splits
    const { data: splitsData } = await supabase
      .from("couple_splits")
      .select("*, transactions(*, categories(name))")
      .eq("couple_id", coupleId);

    setSplits((splitsData || []) as unknown as CoupleSplit[]);

    // Fetch settlements
    const { data: settlementsData } = await supabase
      .from("couple_settlements")
      .select("*")
      .eq("couple_id", coupleId)
      .order("date", { ascending: false });

    setSettlements((settlementsData || []) as Settlement[]);
  }

  useEffect(() => {
    loadCoreData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (coupleId) {
      loadFinanceData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coupleId, currentUser, partner]);

  // Inviting Partner
  async function handleSendInvite(e: FormEvent) {
    e.preventDefault();
    if (!inviteEmail || !currentUser) return;

    setSubmitting(true);
    setStatus(null);

    // Prevent self invite
    if (inviteEmail.toLowerCase() === currentUser.email.toLowerCase()) {
      setStatus("ไม่สามารถส่งคำเชิญให้ตัวเองได้ครับ");
      setSubmitting(false);
      return;
    }

    const { error } = await supabase
      .from("relationship_invites")
      .insert([{
        from_user_id: currentUser.id,
        to_email: inviteEmail.trim().toLowerCase(),
        status: "pending"
      }]);

    setSubmitting(false);
    if (error) {
      setStatus(`ส่งคำเชิญไม่สำเร็จ: ${error.message}`);
    } else {
      setStatus("ส่งคำเชิญเรียบร้อยแล้ว!");
      setInviteEmail("");
      loadCoreData();
    }
  }

  // Cancel sent invite
  async function handleCancelInvite(inviteId: string) {
    const { error } = await supabase
      .from("relationship_invites")
      .delete()
      .eq("id", inviteId);

    if (error) {
      setStatus(`ยกเลิกคำเชิญไม่สำเร็จ: ${error.message}`);
    } else {
      setStatus("ยกเลิกคำเชิญเรียบร้อย");
      loadCoreData();
    }
  }

  // Accept Invite
  async function handleAcceptInvite(inviteId: string) {
    setSubmitting(true);
    setStatus(null);

    const { data, error } = await supabase.rpc("accept_couple_invite", {
      p_invite_id: inviteId
    });

    setSubmitting(false);
    if (error) {
      setStatus(`ตอบรับคำเชิญไม่สำเร็จ: ${error.message}`);
    } else {
      setStatus("จับคู่สำเร็จ! ยินดีต้อนรับสู่โหมดคู่รักครับ");
      loadCoreData();
    }
  }

  // Reject Invite
  async function handleRejectInvite(inviteId: string) {
    const { error } = await supabase
      .from("relationship_invites")
      .update({ status: "rejected" })
      .eq("id", inviteId);

    if (error) {
      setStatus(`ปฏิเสธคำเชิญไม่สำเร็จ: ${error.message}`);
    } else {
      setStatus("ปฏิเสธคำเชิญเรียบร้อย");
      loadCoreData();
    }
  }

  // Unpair couple
  async function handleUnpair() {
    if (!coupleId) return;
    if (!confirm("คุณแน่ใจหรือไม่ว่าต้องการสลายความสัมพันธ์คู่รัก? (ข้อมูลหารค่าใช้จ่ายและงบประมาณร่วมทั้งหมดจะถูกลบออก)")) return;

    setLoading(true);

    // Step 1: Find all shared accounts (couple_id = coupleId)
    const { data: sharedAccounts } = await supabase
      .from("accounts")
      .select("id")
      .eq("couple_id", coupleId);

    // Step 2: Null-ify account_id in transactions referencing shared accounts
    if (sharedAccounts && sharedAccounts.length > 0) {
      const sharedAccountIds = sharedAccounts.map((a) => a.id);
      await supabase
        .from("transactions")
        .update({ account_id: null })
        .in("account_id", sharedAccountIds);
    }

    // Step 3: Delete the couple (cascades to couple_members, couple_splits, shared accounts etc.)
    const { error } = await supabase
      .from("couples")
      .delete()
      .eq("id", coupleId);

    if (error) {
      setStatus(`ไม่สามารถสลายความสัมพันธ์ได้: ${error.message}`);
      setLoading(false);
    } else {
      setStatus("สลายความสัมพันธ์เรียบร้อยแล้ว");
      setCoupleId(null);
      setPartner(null);
      setMembers([]);
      loadCoreData();
    }
  }

  // -------------------------------------------------------------
  // Calculate Net Balances
  // Net Balance = Sum(Tx Amount where user_id = current) - Sum(User Share) + Sum(Settle where from = current) - Sum(Settle where to = current)
  // -------------------------------------------------------------
  const netBalance = useMemo(() => {
    if (!currentUser || !partner) return 0;
    
    let totalPaidForShared = 0;
    let totalUserShare = 0;

    splits.forEach((split) => {
      const tx = split.transactions;
      if (!tx) return;

      // Add to paid amount if current user paid
      if (tx.user_id === currentUser.id) {
        totalPaidForShared += Number(tx.amount);
      }

      // Add user share from split details
      const userDetail = split.details.find(d => d.user_id === currentUser.id);
      if (userDetail) {
        totalUserShare += Number(userDetail.amount);
      }
    });

    // Add settlements
    let totalSettledSent = 0;
    let totalSettledReceived = 0;

    settlements.forEach((s) => {
      if (s.from_user_id === currentUser.id) {
        totalSettledSent += Number(s.amount);
      } else if (s.to_user_id === currentUser.id) {
        totalSettledReceived += Number(s.amount);
      }
    });

    const bal = totalPaidForShared - totalUserShare + totalSettledSent - totalSettledReceived;
    return Math.round(bal * 100) / 100;
  }, [splits, settlements, currentUser, partner]);

  // Handle split insertion
  async function handleCreateSplit(e: FormEvent) {
    e.preventDefault();
    if (!selectedTx || !currentUser || !partner || !coupleId) return;

    setSubmitting(true);
    const amount = Number(selectedTx.amount);
    let details: SplitDetail[] = [];

    if (splitType === "equal") {
      // Split 50/50
      const base = Math.round((amount / 2) * 100) / 100;
      const rem = Math.round((amount - base * 2) * 100) / 100;
      
      details = [
        { user_id: currentUser.id, amount: base + rem, share_value: 1 },
        { user_id: partner.id, amount: base, share_value: 1 }
      ];
    } else {
      // Proportional split
      const currentPct = Number(customPercentage);
      const partnerPct = 100 - currentPct;

      const userAmt = Math.round((amount * currentPct / 100) * 100) / 100;
      const partnerAmt = Math.round((amount - userAmt) * 100) / 100;

      details = [
        { user_id: currentUser.id, amount: userAmt, share_value: currentPct },
        { user_id: partner.id, amount: partnerAmt, share_value: partnerPct }
      ];
    }

    const { error } = await supabase
      .from("couple_splits")
      .insert([{
        transaction_id: selectedTx.id,
        couple_id: coupleId,
        split_type: splitType,
        details
      }]);

    setSubmitting(false);
    setIsSplitModalOpen(false);
    setSelectedTx(null);

    if (error) {
      setStatus(`หารค่าใช้จ่ายไม่สำเร็จ: ${error.message}`);
    } else {
      setStatus("บันทึกการหารเงินเรียบร้อยแล้ว");
      loadFinanceData();
    }
  }

  // Handle split deletion
  async function handleDeleteSplit(splitId: string) {
    if (!confirm("ยกเลิกการหารเงินรายการนี้ใช่หรือไม่?")) return;

    const { error } = await supabase
      .from("couple_splits")
      .delete()
      .eq("id", splitId);

    if (error) {
      setStatus(`ยกเลิกหารเงินไม่สำเร็จ: ${error.message}`);
    } else {
      setStatus("ยกเลิกการหารเงินเรียบร้อย");
      loadFinanceData();
    }
  }

  // Handle settlement insertion
  async function handleCreateSettlement(e: FormEvent) {
    e.preventDefault();
    if (!settleAmount || !currentUser || !partner || !coupleId) return;

    setSubmitting(true);
    const amount = Number(settleAmount);

    const { error } = await supabase
      .from("couple_settlements")
      .insert([{
        couple_id: coupleId,
        from_user_id: currentUser.id,
        to_user_id: partner.id,
        amount,
        note: settleNote || null
      }]);

    setSubmitting(false);
    setIsSettleModalOpen(false);
    setSettleAmount("");
    setSettleNote("");

    if (error) {
      setStatus(`บันทึกโอนเงินคืนไม่สำเร็จ: ${error.message}`);
    } else {
      setStatus("บันทึกการโอนเงินคืนสำเร็จ!");
      loadFinanceData();
    }
  }

  function formatCurrency(val: number) {
    return new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB" }).format(val);
  }

  // Reports tab calculations
  const reportStats = useMemo(() => {
    if (!currentUser || !partner) return { totalSharedExpense: 0, userExpense: 0, partnerExpense: 0, categories: {} as Record<string, number> };

    let total = 0;
    let userExp = 0;
    let partnerExp = 0;
    const cats: Record<string, number> = {};

    splits.forEach((s) => {
      const tx = s.transactions;
      if (!tx || tx.type !== "expense") return;

      const amt = Number(tx.amount);
      total += amt;

      const catName = tx.categories?.name || "อื่นๆ";
      cats[catName] = (cats[catName] || 0) + amt;

      const userShare = s.details.find(d => d.user_id === currentUser.id)?.amount || 0;
      const partnerShare = s.details.find(d => d.user_id === partner.id)?.amount || 0;

      userExp += Number(userShare);
      partnerExp += Number(partnerShare);
    });

    return {
      totalSharedExpense: total,
      userExpense: userExp,
      partnerExpense: partnerExp,
      categories: cats
    };
  }, [splits, currentUser, partner]);

  // Classified transaction data for 3-part dashboard
  const classifiedData = useMemo(() => {
    if (!currentUser || !partner) return {
      user: { income: 0, expense: 0, transactions: [] as Transaction[] },
      partner: { income: 0, expense: 0, transactions: [] as Transaction[] },
      shared: { income: 0, expense: 0, transactions: [] as Transaction[] }
    };

    const userTxs: Transaction[] = [];
    const partnerTxs: Transaction[] = [];
    const sharedTxs: Transaction[] = [];

    let userIncome = 0;
    let userExpense = 0;
    let partnerIncome = 0;
    let partnerExpense = 0;
    let sharedIncome = 0;
    let sharedExpense = 0;

    transactions.forEach((tx: any) => {
      const isSharedAccount = tx.accounts && tx.accounts.couple_id === coupleId;

      if (isSharedAccount) {
        sharedTxs.push(tx);
        if (tx.type === "income") sharedIncome += Number(tx.amount);
        else if (tx.type === "expense") sharedExpense += Number(tx.amount);
      } else {
        if (tx.user_id === currentUser.id) {
          userTxs.push(tx);
          if (tx.type === "income") userIncome += Number(tx.amount);
          else if (tx.type === "expense") userExpense += Number(tx.amount);
        } else {
          partnerTxs.push(tx);
          if (tx.type === "income") partnerIncome += Number(tx.amount);
          else if (tx.type === "expense") partnerExpense += Number(tx.amount);
        }
      }
    });

    return {
      user: { income: userIncome, expense: userExpense, transactions: userTxs },
      partner: { income: partnerIncome, expense: partnerExpense, transactions: partnerTxs },
      shared: { income: sharedIncome, expense: sharedExpense, transactions: sharedTxs }
    };
  }, [transactions, currentUser, partner, coupleId]);

  if (loading) {
    return (
      <main className={styles.page}>
        <p style={{ textAlign: "center", color: "var(--text-secondary)", marginTop: "4rem" }}>กำลังโหลดข้อมูล...</p>
      </main>
    );
  }

  // Render Relationship Setup if not coupled
  if (!coupleId) {
    return (
      <main className={styles.page}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>โหมดคู่รัก (Couple Hub)</h1>
            <p className={styles.subtitle}>เชื่อมต่อเป้าหมาย งบประมาณ และแชร์รายจ่ายร่วมกัน</p>
          </div>
        </div>

        {status && <div style={{ color: '#2ee3a8', marginBottom: '1.5rem', padding: '1rem', background: 'rgba(46,227,168,0.1)', borderRadius: '8px', border: '1px solid rgba(46,227,168,0.2)' }}>{status}</div>}

        <div className={styles.setupCard}>
          <div className={styles.heartIcon}>❤️</div>
          <h2 className={styles.setupTitle}>เชื่อมโยงบัญชีคู่รัก</h2>
          <p className={styles.setupDesc}>
            แชร์บัญชีเพื่อติดตามรายจ่ายร่วมกัน ตั้งเป้าหมายเก็บออมในฝัน และหารค่าสาธารณูปโภคหรือค่าข้าวได้ง่ายขึ้น
          </p>

          <form onSubmit={handleSendInvite}>
            <div className={styles.formGroup}>
              <label className={styles.label}>ระบุอีเมลแฟนของคุณ</label>
              <input
                type="email"
                required
                className={styles.input}
                placeholder="email@partner.com"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
              />
            </div>
            <button type="submit" disabled={submitting} className={styles.btnSubmit}>
              {submitting ? "กำลังส่งคำเชิญ..." : "ส่งคำเชิญเชื่อมสัมพันธ์"}
            </button>
          </form>

          {/* Pending Invites Lists */}
          <div style={{ marginTop: "2rem", textAlign: "left" }}>
            {receivedInvites.length > 0 && (
              <div style={{ marginBottom: "1.5rem" }}>
                <h3 style={{ fontSize: "0.95rem", fontWeight: "600", marginBottom: "0.75rem" }}>📨 คำเชิญที่ได้รับ</h3>
                <div className={styles.invList}>
                  {receivedInvites.map((inv) => (
                    <div key={inv.id} className={styles.invItem}>
                      <div>
                        <span className={styles.invEmail}>{inv.users?.display_name || inv.users?.email}</span>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>ชวนคุณร่วมคู่รัก</div>
                      </div>
                      <div>
                        <button onClick={() => handleAcceptInvite(inv.id)} disabled={submitting} className={`${styles.btnAction} ${styles.btnAccept}`}>
                          รับรัก
                        </button>
                        <button onClick={() => handleRejectInvite(inv.id)} className={`${styles.btnAction} ${styles.btnReject}`}>
                          ปฏิเสธ
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {sentInvites.length > 0 && (
              <div>
                <h3 style={{ fontSize: "0.95rem", fontWeight: "600", marginBottom: "0.75rem" }}>✉️ คำเชิญที่ส่งแล้ว (รอการตอบรับ)</h3>
                <div className={styles.invList}>
                  {sentInvites.map((inv) => (
                    <div key={inv.id} className={styles.invItem}>
                      <span className={styles.invEmail}>{inv.to_email}</span>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <span className={`${styles.invStatus} ${styles.statusPending}`}>กำลังรอ</span>
                        <button onClick={() => handleCancelInvite(inv.id)} className={`${styles.btnAction} ${styles.btnReject}`} style={{ padding: "2px 8px" }}>
                          ยกเลิก
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    );
  }

  if (!currentUser || !partner) {
    return (
      <main className={styles.page}>
        <p style={{ textAlign: "center", color: "var(--text-secondary)", marginTop: "4rem" }}>กำลังโหลดข้อมูลโปรไฟล์คู่รัก...</p>
      </main>
    );
  }

  // Render coupled dashboard
  return (
    <main className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>โหมดคู่รัก (Couple Hub) 💖</h1>
          <p className={styles.subtitle}>แผงควบคุมระบบบัญชีคู่รักและยอดหารการเงินร่วมกัน</p>
        </div>
      </div>

      {status && <div style={{ color: '#2ee3a8', marginBottom: '1.5rem', padding: '1rem', background: 'rgba(46,227,168,0.1)', borderRadius: '8px', border: '1px solid rgba(46,227,168,0.2)' }}>{status}</div>}

      {/* Navigation tabs */}
      <div className={styles.tabsContainer}>
        <button onClick={() => setActiveTab("dashboard")} className={`${styles.tabBtn} ${activeTab === "dashboard" ? styles.tabBtnActive : ""}`}>
          <LayoutDashboard size={16} /> แดชบอร์ดคู่รัก
        </button>
        <button onClick={() => setActiveTab("splits")} className={`${styles.tabBtn} ${activeTab === "splits" ? styles.tabBtnActive : ""}`}>
          <Split size={16} /> หารค่าใช้จ่าย
        </button>
        <button onClick={() => setActiveTab("reports")} className={`${styles.tabBtn} ${activeTab === "reports" ? styles.tabBtnActive : ""}`}>
          <BarChart3 size={16} /> รายงานคู่รัก
        </button>
        <button onClick={() => setActiveTab("relationship")} className={`${styles.tabBtn} ${activeTab === "relationship" ? styles.tabBtnActive : ""}`}>
          <Users size={16} /> ความสัมพันธ์
        </button>
      </div>

      {/* Tab Contents: Dashboard */}
      {activeTab === "dashboard" && (
        <div className={styles.dashboardGrid}>
          {/* Column 1: บัญชีส่วนตัวของเรา */}
          <div className={styles.dashboardCol}>
            <div className={styles.colHeader}>
              <User size={20} style={{ color: "#4f8cff" }} />
              <span className={styles.colTitleText}>1. บัญชีส่วนตัวของฉัน</span>
            </div>
            
            <div className={styles.flowSummary}>
              <div className={styles.flowCard}>
                <span className={styles.flowCardLabel}>รายรับรวม</span>
                <span className={`${styles.flowCardValue} ${styles.incomeText}`}>
                  +฿{classifiedData.user.income.toLocaleString()}
                </span>
              </div>
              <div className={styles.flowCard}>
                <span className={styles.flowCardLabel}>รายจ่ายรวม</span>
                <span className={`${styles.flowCardValue} ${styles.expenseText}`}>
                  -฿{classifiedData.user.expense.toLocaleString()}
                </span>
              </div>
              <div className={`${styles.flowCard} ${styles.flowSummaryFull}`}>
                <span className={styles.flowCardLabel}>ยอดดุลสุทธิ</span>
                <span className={`${styles.flowCardValue} ${classifiedData.user.income - classifiedData.user.expense >= 0 ? styles.incomeText : styles.expenseText}`}>
                  ฿{(classifiedData.user.income - classifiedData.user.expense).toLocaleString()}
                </span>
              </div>
            </div>

            <div className={styles.miniTxSection}>
              <span className={styles.sectionLabel}>รายการล่าสุด</span>
              <div className={styles.miniTxList}>
                {classifiedData.user.transactions.slice(0, 10).map((tx) => (
                  <div key={tx.id} className={styles.miniTxItem}>
                    <div className={styles.miniTxMeta}>
                      <div className={styles.miniTxCategory}>{tx.categories?.name || "อื่นๆ"}</div>
                      {tx.note && <div className={styles.miniTxNote}>{tx.note}</div>}
                      <div className={styles.miniTxDate}>{tx.date}</div>
                    </div>
                    <div className={styles.miniTxRight}>
                      <span className={`${styles.miniTxAmt} ${tx.type === "income" ? styles.incomeText : styles.expenseText}`}>
                        {tx.type === "income" ? "+" : "-"}฿{Number(tx.amount).toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
                {classifiedData.user.transactions.length === 0 && (
                  <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", textAlign: "center", padding: "1.5rem" }}>
                    ไม่มีข้อมูลธุรกรรมส่วนตัว
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Column 2: บัญชีส่วนตัวของแฟน */}
          <div className={styles.dashboardCol}>
            <div className={styles.colHeader}>
              <Heart size={20} style={{ color: "#ff6580" }} />
              <span className={styles.colTitleText}>2. บัญชีส่วนตัวของแฟน ({partner.display_name || "แฟน"})</span>
            </div>

            <div className={styles.flowSummary}>
              <div className={styles.flowCard}>
                <span className={styles.flowCardLabel}>รายรับรวม</span>
                <span className={`${styles.flowCardValue} ${styles.incomeText}`}>
                  +฿{classifiedData.partner.income.toLocaleString()}
                </span>
              </div>
              <div className={styles.flowCard}>
                <span className={styles.flowCardLabel}>รายจ่ายรวม</span>
                <span className={`${styles.flowCardValue} ${styles.expenseText}`}>
                  -฿{classifiedData.partner.expense.toLocaleString()}
                </span>
              </div>
              <div className={`${styles.flowCard} ${styles.flowSummaryFull}`}>
                <span className={styles.flowCardLabel}>ยอดดุลสุทธิ</span>
                <span className={`${styles.flowCardValue} ${classifiedData.partner.income - classifiedData.partner.expense >= 0 ? styles.incomeText : styles.expenseText}`}>
                  ฿{(classifiedData.partner.income - classifiedData.partner.expense).toLocaleString()}
                </span>
              </div>
            </div>

            <div className={styles.miniTxSection}>
              <span className={styles.sectionLabel}>รายการล่าสุด</span>
              <div className={styles.miniTxList}>
                {classifiedData.partner.transactions.slice(0, 10).map((tx) => (
                  <div key={tx.id} className={styles.miniTxItem}>
                    <div className={styles.miniTxMeta}>
                      <div className={styles.miniTxCategory}>{tx.categories?.name || "อื่นๆ"}</div>
                      {tx.note && <div className={styles.miniTxNote}>{tx.note}</div>}
                      <div className={styles.miniTxDate}>{tx.date}</div>
                    </div>
                    <div className={styles.miniTxRight}>
                      <span className={`${styles.miniTxAmt} ${tx.type === "income" ? styles.incomeText : styles.expenseText}`}>
                        {tx.type === "income" ? "+" : "-"}฿{Number(tx.amount).toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
                {classifiedData.partner.transactions.length === 0 && (
                  <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", textAlign: "center", padding: "1.5rem" }}>
                    ไม่มีข้อมูลธุรกรรมส่วนตัวแฟน
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Column 3: บัญชีกลาง */}
          <div className={styles.dashboardCol}>
            <div className={styles.colHeader}>
              <Wallet size={20} style={{ color: "#2ee3a8" }} />
              <span className={styles.colTitleText}>3. บัญชีรายรับ-รายจ่าย บัญชีกลาง</span>
            </div>

            <div className={styles.flowSummary}>
              <div className={styles.flowCard}>
                <span className={styles.flowCardLabel}>รายรับรวม</span>
                <span className={`${styles.flowCardValue} ${styles.incomeText}`}>
                  +฿{classifiedData.shared.income.toLocaleString()}
                </span>
              </div>
              <div className={styles.flowCard}>
                <span className={styles.flowCardLabel}>รายจ่ายรวม</span>
                <span className={`${styles.flowCardValue} ${styles.expenseText}`}>
                  -฿{classifiedData.shared.expense.toLocaleString()}
                </span>
              </div>
              <div className={`${styles.flowCard} ${styles.flowSummaryFull}`}>
                <span className={styles.flowCardLabel}>ยอดดุลสุทธิบัญชีกลาง</span>
                <span className={`${styles.flowCardValue} ${classifiedData.shared.income - classifiedData.shared.expense >= 0 ? styles.incomeText : styles.expenseText}`}>
                  ฿{(classifiedData.shared.income - classifiedData.shared.expense).toLocaleString()}
                </span>
              </div>
            </div>

            <div className={styles.miniTxSection}>
              <span className={styles.sectionLabel}>รายการล่าสุด</span>
              <div className={styles.miniTxList}>
                {classifiedData.shared.transactions.slice(0, 10).map((tx) => (
                  <div key={tx.id} className={styles.miniTxItem}>
                    <div className={styles.miniTxMeta}>
                      <div className={styles.miniTxCategory}>{tx.categories?.name || "อื่นๆ"}</div>
                      {tx.note && <div className={styles.miniTxNote}>{tx.note}</div>}
                      <div className={styles.miniTxDate}>{tx.date}</div>
                    </div>
                    <div className={styles.miniTxRight}>
                      <span className={`${styles.miniTxAmt} ${tx.type === "income" ? styles.incomeText : styles.expenseText}`}>
                        {tx.type === "income" ? "+" : "-"}฿{Number(tx.amount).toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
                {classifiedData.shared.transactions.length === 0 && (
                  <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", textAlign: "center", padding: "1.5rem" }}>
                    ไม่มีข้อมูลธุรกรรมบัญชีกลาง
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab Contents: Relationship */}
      {activeTab === "relationship" && (
        <div className={styles.grid}>
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>💖 ข้อมูลความสัมพันธ์</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              <div className={styles.partnerBox}>
                <div className={styles.avatar}>
                  {(partner.display_name || partner.email)[0].toUpperCase()}
                </div>
                <div>
                  <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>แฟนของคุณ</div>
                  <div className={styles.partnerName}>{partner.display_name || "คู่รัก"}</div>
                  <div className={styles.partnerEmail}>{partner.email}</div>
                </div>
              </div>
              <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: "1rem" }}>
                <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                  คุณและคู่รักสามารถมองเห็นงบประมาณร่วม (Shared Budgets) และเป้าหมายร่วม (Shared Goals) ร่วมกันในหน้าเฉพาะได้โดยสลับแท็บ และหารายการจ่ายได้ในแท็บ &quot;หารค่าใช้จ่าย&quot;
                </p>
              </div>
              <button onClick={handleUnpair} className={styles.btnUnpair}>
                💔 สลายคู่รัก / แยกทางบัญชี
              </button>
            </div>
          </div>

          <div className={styles.card}>
            <h2 className={styles.cardTitle}>💡 คำแนะนำการเงินคู่รัก</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "0.9rem", color: "var(--text-secondary)", lineHeight: "1.5" }}>
              <p>📍 **หารเงินด่วน:** เลือกรายการจ่ายที่เกิดขึ้นในหน้าประวัติแล้วกดปุ่ม &quot;หารเงิน&quot; เพื่อจัดเก็บยอดหาร</p>
              <p>📍 **เคลียร์ยอดค้าง:** เมื่อฝ่ายที่ติดหนี้ทำการโอนเงินคืนเสร็จเรียบร้อย ให้กดปุ่ม &quot;บันทึกชำระคืน&quot; เพื่อลดยอดค้างสะสมลงเป็นศูนย์</p>
              <p>📍 **สร้างเป้าหมายคู่:** เข้าเมนูเป้าหมายออมเงินหลัก แล้วกดเปลี่ยนแท็บเป็น &quot;เป้าหมายร่วม&quot; เพื่อออมเงินเพื่อทริปในฝันหรือคอนโดใหม่ร่วมกัน</p>
            </div>
          </div>
        </div>
      )}

      {/* Tab Contents: Splits */}
      {activeTab === "splits" && (
        <div className={styles.grid}>
          {/* Debt Settlement Summary */}
          <div className={styles.card} style={{ gridColumn: "1 / -1" }}>
            <h2 className={styles.cardTitle}>📊 สรุปยอดค้างชำระคู่รัก</h2>
            <div className={styles.summaryRow}>
              <div className={styles.summaryCard}>
                <span className={styles.summaryLabel}>สถานะยอดเงินของคุณ</span>
                {netBalance > 0 ? (
                  <>
                    <span className={`${styles.summaryValue} ${styles.valueGet}`}>+฿{netBalance.toLocaleString()}</span>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>แฟนค้างเงินคุณอยู่</span>
                  </>
                ) : netBalance < 0 ? (
                  <>
                    <span className={`${styles.summaryValue} ${styles.valueOwe}`}>-฿{Math.abs(netBalance).toLocaleString()}</span>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>คุณค้างเงินแฟนอยู่</span>
                  </>
                ) : (
                  <>
                    <span className={`${styles.summaryValue} ${styles.valueNeutral}`}>฿0.00</span>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>ไม่มีเงินค้างชำระกัน</span>
                  </>
                )}
              </div>
              <div className={styles.summaryCard} style={{ justifyContent: "center" }}>
                <span className={styles.summaryLabel}>จัดการหนี้สิน</span>
                {netBalance !== 0 ? (
                  <button onClick={() => setIsSettleModalOpen(true)} className={styles.btnSettle}>
                    💵 {netBalance < 0 ? "บันทึกการคืนเงินแฟน" : "แฟนคืนเงินเรียบร้อย"}
                  </button>
                ) : (
                  <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "6px" }}>เคลียร์เงินลงตัวเรียบร้อยแล้ว</span>
                )}
              </div>
            </div>
          </div>

          {/* Transactions to split list */}
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>🛍️ ธุรกรรมเดี่ยวที่สามารถเอามาหารได้</h2>
            <div className={styles.txList}>
              {transactions
                .filter(t => !splits.some(s => s.transaction_id === t.id))
                .map((t) => (
                  <div key={t.id} className={styles.txItem}>
                    <div className={styles.txMeta}>
                      <div className={styles.txTitle}>{t.categories?.name || "อื่นๆ"}</div>
                      <div className={styles.txSub}>
                        {t.date} | จ่ายโดย: {t.user_id === currentUser.id ? "คุณ" : partner.display_name || "แฟน"}
                        {t.note && ` | โน้ต: ${t.note}`}
                      </div>
                    </div>
                    <div className={styles.txRight}>
                      <div className={styles.txAmount} style={{ color: t.type === "expense" ? "#ff6580" : "#2ee3a8" }}>
                        {t.type === "expense" ? "-" : "+"}฿{Number(t.amount).toLocaleString()}
                      </div>
                      <button onClick={() => { setSelectedTx(t); setIsSplitModalOpen(true); }} className={styles.btnSplitAction}>
                        หารเงิน
                      </button>
                    </div>
                  </div>
                ))}
              {transactions.filter(t => !splits.some(s => s.transaction_id === t.id)).length === 0 && (
                <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", textAlign: "center", padding: "1rem" }}>
                  ไม่มีธุรกรรมใหม่ที่ยังไม่ได้หารเงิน
                </p>
              )}
            </div>
          </div>

          {/* Active splits history */}
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>📜 ประวัติการหารเงินที่ทำงานอยู่</h2>
            <div className={styles.txList}>
              {splits.map((s) => {
                const tx = s.transactions;
                if (!tx) return null;
                const userShare = s.details.find(d => d.user_id === currentUser.id)?.amount || 0;
                const partnerShare = s.details.find(d => d.user_id === partner.id)?.amount || 0;

                return (
                  <div key={s.id} className={styles.txItem}>
                    <div className={styles.txMeta}>
                      <div className={styles.txTitle}>{tx.categories?.name || "อื่นๆ"}</div>
                      <div className={styles.txSub}>
                        ยอดรวม: ฿{Number(tx.amount).toLocaleString()} | ส่วนของคุณ: ฿{Number(userShare).toLocaleString()} | ส่วนของแฟน: ฿{Number(partnerShare).toLocaleString()}
                      </div>
                    </div>
                    <div className={styles.txRight}>
                      <span style={{ fontSize: "0.75rem", background: "rgba(255,255,255,0.06)", padding: "2px 6px", borderRadius: "4px", marginRight: "10px" }}>
                        {s.split_type === "equal" ? "เท่ากัน" : "สัดส่วน"}
                      </span>
                      <button onClick={() => handleDeleteSplit(s.id)} style={{ background: "transparent", border: "none", color: "#ff6580", cursor: "pointer", fontSize: "0.85rem" }}>
                        ✕ ยกเลิก
                      </button>
                    </div>
                  </div>
                );
              })}
              {splits.length === 0 && (
                <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", textAlign: "center", padding: "1rem" }}>
                  ยังไม่มีประวัติการตั้งหารค่าใช้จ่ายร่วมกัน
                </p>
              )}
            </div>
          </div>

          {/* Settlements history */}
          <div className={styles.card} style={{ gridColumn: "1 / -1" }}>
            <h2 className={styles.cardTitle}>💸 ประวัติการโอนชำระเงินคืนล่าสุด</h2>
            <div className={styles.txList}>
              {settlements.map((s) => (
                <div key={s.id} className={styles.txItem}>
                  <div className={styles.txMeta}>
                    <div className={styles.txTitle}>
                      {s.from_user_id === currentUser.id ? "คุณ" : partner.display_name || "แฟน"} ➡️ โอนเงินคืนให้ {s.to_user_id === currentUser.id ? "คุณ" : partner.display_name || "แฟน"}
                    </div>
                    <div className={styles.txSub}>
                      วันที่: {s.date} {s.note && `| บันทึกเพิ่มเติม: ${s.note}`}
                    </div>
                  </div>
                  <div className={styles.txRight}>
                    <span style={{ fontWeight: "700", color: "#2ee3a8" }}>
                      ฿{Number(s.amount).toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
              {settlements.length === 0 && (
                <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", textAlign: "center", padding: "1rem" }}>
                  ยังไม่มีประวัติการโอนชำระเงินคืน
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab Contents: Reports */}
      {activeTab === "reports" && (
        <div className={styles.grid}>
          {/* Main stats card */}
          <div className={styles.card} style={{ gridColumn: "1 / -1" }}>
            <h2 className={styles.cardTitle}>📈 สรุปสถิติการใช้จ่ายแชร์ร่วมกัน</h2>
            <div className={styles.summaryRow}>
              <div className={styles.summaryCard}>
                <span className={styles.summaryLabel}>ยอดใช้จ่ายแชร์รวมทั้งหมด</span>
                <span className={styles.summaryValue} style={{ color: "#4f8cff" }}>
                  ฿{reportStats.totalSharedExpense.toLocaleString()}
                </span>
              </div>
              <div className={styles.summaryCard}>
                <span className={styles.summaryLabel}>ยอดของคุณที่ใช้ไปจริง</span>
                <span className={styles.summaryValue}>
                  ฿{reportStats.userExpense.toLocaleString()}
                </span>
              </div>
              <div className={styles.summaryCard}>
                <span className={styles.summaryLabel}>ยอดของแฟนที่ใช้ไปจริง</span>
                <span className={styles.summaryValue}>
                  ฿{reportStats.partnerExpense.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Shared expenses by category */}
          <div className={styles.card} style={{ gridColumn: "1 / -1" }}>
            <h2 className={styles.cardTitle}>🍔 ยอดใช้จ่ายแชร์จำแนกรายหมวดหมู่</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
              {Object.entries(reportStats.categories).map(([catName, amount]) => {
                const percent = reportStats.totalSharedExpense > 0 ? (amount / reportStats.totalSharedExpense) * 100 : 0;
                return (
                  <div key={catName} style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.9rem" }}>
                      <span>{catName}</span>
                      <span style={{ fontWeight: "600" }}>฿{amount.toLocaleString()} ({percent.toFixed(1)}%)</span>
                    </div>
                    <div style={{ height: "8px", background: "rgba(255,255,255,0.06)", borderRadius: "4px", overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${percent}%`, background: "linear-gradient(90deg, #ff6580, #4f8cff)" }} />
                    </div>
                  </div>
                );
              })}
              {Object.keys(reportStats.categories).length === 0 && (
                <p style={{ textAlign: "center", color: "var(--text-secondary)", padding: "2rem" }}>
                  ยังไม่มีประวัติค่าใช้จ่ายแชร์ของหมวดหมู่ใดๆ
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Split Modal */}
      {isSplitModalOpen && selectedTx && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h2>ตั้งค่าการหารเงิน</h2>
            <div style={{ marginBottom: "1rem", background: "rgba(255,255,255,0.02)", padding: "10px", borderRadius: "8px" }}>
              <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>รายการธุรกรรม</div>
              <div style={{ fontWeight: "600" }}>{selectedTx.categories?.name || "อื่นๆ"} | ฿{Number(selectedTx.amount).toLocaleString()}</div>
              {selectedTx.note && <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>โน้ต: {selectedTx.note}</div>}
            </div>

            <form onSubmit={handleCreateSplit}>
              <div className={styles.formGroup}>
                <label className={styles.label}>วิธีหารเงิน</label>
                <select value={splitType} onChange={e => setSplitType(e.target.value as any)} className={styles.select}>
                  <option value="equal">หารเท่ากันคนละครึ่ง (50/50)</option>
                  <option value="percentage">ระบุสัดส่วนเป็นเปอร์เซ็นต์</option>
                </select>
              </div>

              {splitType === "percentage" && (
                <div className={styles.formGroup}>
                  <label className={styles.label}>ส่วนแบ่งของคุณ (%)</label>
                  <input
                    type="number"
                    min="1"
                    max="99"
                    required
                    className={styles.input}
                    value={customPercentage}
                    onChange={e => setCustomPercentage(e.target.value)}
                  />
                  <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "4px" }}>
                    ส่วนแบ่งของคู่รัก: {100 - Number(customPercentage)}%
                  </div>
                </div>
              )}

              <div className={styles.modalActions}>
                <button type="button" onClick={() => { setIsSplitModalOpen(false); setSelectedTx(null); }} className={styles.btnCancel}>
                  ยกเลิก
                </button>
                <button type="submit" disabled={submitting} className={styles.btnSubmit} style={{ width: "auto", padding: "8px 24px" }}>
                  {submitting ? "กำลังดำเนินการ..." : "ยืนยันการตั้งหาร"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Settle Modal */}
      {isSettleModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h2>บันทึกชำระเงินคืน</h2>
            <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "1.5rem" }}>
              กรอกจำนวนเงินที่คุณต้องการปรับลดหนี้สะสมระหว่างคู่รัก (เมื่อมีการโอนเงินหรือให้เงินเคลียร์หนี้กันจริงๆ เรียบร้อย)
            </p>

            <form onSubmit={handleCreateSettlement}>
              <div className={styles.formGroup}>
                <label className={styles.label}>จำนวนเงินโอนคืน (บาท)</label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                  placeholder={netBalance < 0 ? String(Math.abs(netBalance)) : ""}
                  className={styles.input}
                  value={settleAmount}
                  onChange={e => setSettleAmount(e.target.value)}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>โน้ตบันทึกเพิ่มเติม</label>
                <input
                  type="text"
                  placeholder="เช่น โอนคืนค่าน้ำค่าไฟ"
                  className={styles.input}
                  value={settleNote}
                  onChange={e => setSettleNote(e.target.value)}
                />
              </div>

              <div className={styles.modalActions}>
                <button type="button" onClick={() => setIsSettleModalOpen(false)} className={styles.btnCancel}>
                  ยกเลิก
                </button>
                <button type="submit" disabled={submitting} className={styles.btnSubmit} style={{ width: "auto", padding: "8px 24px" }}>
                  {submitting ? "กำลังบันทึก..." : "ยืนยัน"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
