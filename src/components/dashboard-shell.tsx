"use client";

import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import LogoutButton from "@/components/logout-button";
import ThemeToggle from "@/components/theme-toggle";
import styles from "./dashboard-shell.module.css";
import {
  LayoutDashboard,
  ArrowDownCircle,
  ArrowUpCircle,
  Split,
  ArrowLeftRight,
  Wallet,
  LayoutGrid,
  Tag,
  PiggyBank,
  Target,
  HandCoins,
  Gem,
  Receipt,
  BarChart3,
  Calendar,
  Search,
  Bell,
  MessageSquare,
  Settings,
  Users,
  Shield,
  History,
  RefreshCw,
  Heart,
  Home,
  FileText,
  Menu,
  X,
} from "lucide-react";

type DashboardShellProps = {
  email?: string;
  children: React.ReactNode;
};

type MenuGroup = {
  title: string;
  items: { label: string; href: string; icon: React.ComponentType<{ className?: string; size?: number }> }[];
};

const menuGroups: MenuGroup[] = [
  {
    title: "ภาพรวม",
    items: [{ label: "Dashboard", href: "/dashboard", icon: LayoutDashboard }],
  },
  {
    title: "รายการ",
    items: [
      { label: "รายรับ", href: "/dashboard/income", icon: ArrowDownCircle },
      { label: "รายจ่าย", href: "/dashboard/expense", icon: ArrowUpCircle },
      { label: "Split Transaction", href: "/dashboard/splits", icon: Split },
      { label: "โอนเงิน", href: "/dashboard/transfer", icon: ArrowLeftRight },
      { label: "บัญชี", href: "/dashboard/accounts", icon: Wallet },
      { label: "หมวดหมู่", href: "/dashboard/categories", icon: LayoutGrid },
      { label: "แท็ก", href: "/dashboard/tags", icon: Tag },
      { label: "งบประมาณ", href: "/dashboard/budgets", icon: PiggyBank },
      { label: "เป้าหมายการออม", href: "/dashboard/goals", icon: Target },
      { label: "หนี้สิน", href: "/dashboard/debts", icon: HandCoins },
      { label: "สินทรัพย์", href: "/dashboard/assets", icon: Gem },
      { label: "บิล / Subscription", href: "/dashboard/subscriptions", icon: Receipt },
      { label: "รายการประจำ", href: "/dashboard/recurring", icon: RefreshCw },
    ],
  },
  {
    title: "วิเคราะห์",
    items: [
      { label: "รายงาน", href: "/dashboard/reports", icon: BarChart3 },
      { label: "ปฏิทิน", href: "/dashboard/calendar", icon: Calendar },
      { label: "ค้นหา / กรอง", href: "/dashboard/search", icon: Search },
    ],
  },
  {
    title: "อื่นๆ",
    items: [
      { label: "โหมดคู่รัก", href: "/dashboard/couple", icon: Heart },
      { label: "แจ้งเตือน", href: "/dashboard/alerts", icon: Bell },
      { label: "LINE Bot", href: "/dashboard/line", icon: MessageSquare },
      { label: "ประวัติกิจกรรม", href: "/dashboard/audit-logs", icon: History },
      { label: "ตั้งค่า", href: "/dashboard/settings", icon: Settings },
      { label: "ผู้ใช้งาน", href: "/dashboard/users", icon: Users },
      { label: "ความปลอดภัย", href: "/dashboard/security", icon: Shield },
    ],
  },
];

export default function DashboardShell({ email, children }: DashboardShellProps) {
  const pathname = usePathname();
  const supabase = useMemo(() => createClient(), []);

  const [coupleId, setCoupleId] = useState<string | null>(null);
  const [partnerName, setPartnerName] = useState<string>("แฟนของฉัน");
  const [userName, setUserName] = useState<string>("ฉัน");
  const [partnerId, setPartnerId] = useState<string | null>(null);
  const [myUserId, setMyUserId] = useState<string | null>(null);
  const [sharedBalance, setSharedBalance] = useState<number>(0);
  const [userNetBalance, setUserNetBalance] = useState<number | null>(null);
  const [partnerNetBalance, setPartnerNetBalance] = useState<number | null>(null);
  const [userSharePercent, setUserSharePercent] = useState<number>(50);
  const [partnerSharePercent, setPartnerSharePercent] = useState<number>(50);
  const [sharedGoalText, setSharedGoalText] = useState<string>("เป้าหมายร่วม");
  const [sharedGoalPercent, setSharedGoalPercent] = useState<number>(0);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    async function loadCoupleStatus() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: myMember } = await supabase
        .from("couple_members")
        .select("couple_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!myMember) return;
      const cId = myMember.couple_id;
      setCoupleId(cId);

      const { data: allMembers } = await supabase
        .from("couple_members")
        .select("user_id, users(display_name, email)")
        .eq("couple_id", cId);

      if (allMembers) {
        const other = allMembers.find(m => m.user_id !== user.id);
        const me = allMembers.find(m => m.user_id === user.id);
        if (other && other.users) {
          const otherProfile = other.users as any;
          setPartnerName(otherProfile.display_name || otherProfile.email.split("@")[0]);
          setPartnerId(other.user_id);
        }
        if (me && me.users) {
          const myProfile = me.users as any;
          setUserName(myProfile.display_name || "ฉัน");
          setMyUserId(user.id);
        }
      }

      // Fetch total account balance per member
      const partnerUid = allMembers?.find(m => m.user_id !== user.id)?.user_id;
      const memberIds = allMembers?.map(m => m.user_id) || [];
      if (memberIds.length > 0) {
        const { data: accs } = await supabase
          .from("accounts")
          .select("user_id, balance")
          .in("user_id", memberIds);

        let myTotal = 0;
        let partnerTotal = 0;
        accs?.forEach(acc => {
          if (acc.user_id === user.id) myTotal += Number(acc.balance);
          else if (acc.user_id === partnerUid) partnerTotal += Number(acc.balance);
        });
        setUserNetBalance(myTotal);
        setPartnerNetBalance(partnerTotal);
      }

      // Fetch shared accounts balance
      const { data: accounts } = await supabase
        .from("accounts")
        .select("balance")
        .eq("couple_id", cId);

      const totalBalance = accounts?.reduce((sum, acc) => sum + Number(acc.balance), 0) || 0;
      setSharedBalance(totalBalance);

      // Fetch splits to calculate contribution percentage
      const { data: splits } = await supabase
        .from("couple_splits")
        .select("*, transactions(user_id, amount)")
        .eq("couple_id", cId);

      let userPaid = 0;
      let partnerPaid = 0;
      splits?.forEach((s) => {
        const tx = s.transactions;
        if (!tx) return;
        if (tx.user_id === user.id) {
          userPaid += Number(tx.amount);
        } else {
          partnerPaid += Number(tx.amount);
        }
      });

      const totalPaid = userPaid + partnerPaid;
      if (totalPaid > 0) {
        const uPct = Math.round((userPaid / totalPaid) * 100);
        setUserSharePercent(uPct);
        setPartnerSharePercent(100 - uPct);
      } else {
        setUserSharePercent(50);
        setPartnerSharePercent(50);
      }

      // Fetch first shared goal
      const { data: goals } = await supabase
        .from("goals")
        .select("*, accounts(balance)")
        .eq("couple_id", cId)
        .limit(1);

      if (goals && goals.length > 0) {
        const goal = goals[0];
        const currentAmt = goal.accounts?.balance || 0;
        const pct = Math.min(100, Math.max(0, (currentAmt / goal.target_amount) * 100));
        setSharedGoalText(goal.name);
        setSharedGoalPercent(Math.round(pct));
      } else {
        setSharedGoalText("สร้างเป้าหมายร่วมกัน");
        setSharedGoalPercent(0);
      }
    }

    loadCoupleStatus();
  }, [supabase]);

  function isActive(href: string) {
    if (href === "/dashboard") {
      return pathname === "/dashboard";
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <img src="/LOGO.png" alt="Logo" style={{ height: 32, width: "auto", borderRadius: 6 }} />
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span className={styles.brandTitle}>Money Couple</span>
              <span className={styles.brandSub}>บัญชีง่าย ชีวิตสบาย</span>
            </div>
          </div>
        </div>

        {menuGroups.map((group) => (
          <section key={group.title}>
            <p className={styles.groupTitle}>{group.title}</p>
            <nav className={styles.menu}>
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    className={`${styles.item} ${active ? styles.active : ""}`.trim()}
                  >
                    <Icon className={styles.itemIcon} aria-hidden="true" size={18} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </section>
        ))}
        <ThemeToggle variant="sidebar" />
      </aside>

      <div className={styles.main}>
        <header className={styles.topbar}>
          <div>
            <h1 className={styles.welcome}>สวัสดีครับ</h1>
            <small>ภาพรวมการเงินของวันนี้</small>
          </div>
          <div className={styles.topRight}>
            <ThemeToggle variant="topbar" />
            <span className={styles.chip}>{email ?? "guest"}</span>
            <div className={styles.topRightActions}>
              {/* Mobile menu button — shown only on mobile */}
              <button
                className={styles.menuBtn}
                onClick={() => setDrawerOpen(true)}
                aria-label="เปิดเมนู"
              >
                <Menu size={22} />
              </button>
              <LogoutButton />
            </div>
          </div>
        </header>

        {/* Mobile Drawer Overlay */}
        {drawerOpen && (
          <div className={styles.drawerOverlay} onClick={() => setDrawerOpen(false)} />
        )}

        {/* Mobile Drawer */}
        <div className={`${styles.drawer} ${drawerOpen ? styles.drawerOpen : ""}`}>
          <div className={styles.drawerHeader}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <img src="/LOGO.png" alt="Logo" style={{ height: 28, width: "auto", borderRadius: 6 }} />
              <span style={{ fontWeight: 700, fontSize: 16 }}>Money Couple</span>
            </div>
            <button className={styles.drawerClose} onClick={() => setDrawerOpen(false)}>
              <X size={22} />
            </button>
          </div>
          <div className={styles.drawerBody}>
            {menuGroups.map((group) => (
              <section key={group.title} style={{ marginBottom: 16 }}>
                <p className={styles.drawerGroupTitle}>{group.title}</p>
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href);
                  return (
                    <Link
                      key={item.label}
                      href={item.href}
                      className={`${styles.drawerItem} ${active ? styles.drawerItemActive : ""}`}
                      onClick={() => setDrawerOpen(false)}
                    >
                      <Icon size={18} />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </section>
            ))}
          </div>
          <div className={styles.drawerFooter}>
            <ThemeToggle variant="sidebar" />
            <LogoutButton />
          </div>
        </div>

        <div className={styles.content}>{children}</div>
      </div>

      <div className={styles.mobileNav}>
        <Link href="/dashboard" className={`${styles.mobileItem} ${isActive("/dashboard") ? styles.mobileActive : ""}`}>
          <LayoutDashboard size={20} />
          <span>ภาพรวม</span>
        </Link>
        <Link href="/dashboard/income" className={`${styles.mobileItem} ${isActive("/dashboard/income") ? styles.mobileActive : ""}`}>
          <ArrowDownCircle size={20} />
          <span>รายรับ</span>
        </Link>
        <Link href="/dashboard/expense" className={`${styles.mobileItem} ${isActive("/dashboard/expense") ? styles.mobileActive : ""}`}>
          <ArrowUpCircle size={20} />
          <span>รายจ่าย</span>
        </Link>
        <Link href="/dashboard/accounts" className={`${styles.mobileItem} ${isActive("/dashboard/accounts") ? styles.mobileActive : ""}`}>
          <Wallet size={20} />
          <span>บัญชี</span>
        </Link>
        <Link href="/dashboard/couple" className={`${styles.mobileItem} ${isActive("/dashboard/couple") ? styles.mobileActive : ""}`}>
          <Heart size={20} />
          <span>คู่รัก</span>
        </Link>
      </div>

      {coupleId && (
        <div className={styles.coupleBar}>
          <div className={styles.coupleSection}>
            <div className={`${styles.coupleIconCircle} ${styles.iconHeart}`}>
              <Heart size={18} />
            </div>
            <div className={styles.coupleMeta}>
              <span className={styles.coupleLabel}>โหมดคู่รัก</span>
              <span className={styles.coupleValue}>
                <Link href="/dashboard/couple" className={styles.coupleLink}>บัญชีของเรา 💖</Link>
              </span>
            </div>
          </div>

          <div className={styles.coupleSection}>
            <div className={`${styles.coupleIconCircle} ${styles.iconHome}`}>
              <Home size={18} />
            </div>
            <div className={styles.coupleMeta}>
              <span className={styles.coupleLabel}>บัญชีกลาง</span>
              <span className={styles.coupleValue} style={{ color: "#2ee3a8" }}>
                {new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB" }).format(sharedBalance)}
              </span>
            </div>
          </div>

          <div className={styles.coupleProgressBox}>
            <div style={{ fontSize: 11, color: "#8a8fa8", marginBottom: 6, fontWeight: 500, letterSpacing: "0.03em" }}>เงินคงเหลือทั้งหมด</div>
            <div className={styles.userProgressItem}>
              <div className={styles.userMiniAvatar}>
                {userName[0].toUpperCase()}
              </div>
              <div className={styles.progressBarContainer}>
                <div className={styles.progressLabel}>
                  <span className={styles.progressLabelName}>{userName}</span>
                  <span style={{ color: userNetBalance !== null && userNetBalance >= 0 ? "#2ee3a8" : "#ff6580", fontWeight: 600 }}>
                    {userNetBalance !== null
                      ? new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB", maximumFractionDigits: 0 }).format(userNetBalance)
                      : "-"}
                  </span>
                </div>
                <div className={styles.progressBarTrack}>
                  <div className={styles.progressBarFillUser} style={{ width: userNetBalance !== null && partnerNetBalance !== null && (userNetBalance + partnerNetBalance) > 0 ? `${Math.round((userNetBalance / (userNetBalance + partnerNetBalance)) * 100)}%` : "50%" }} />
                </div>
              </div>
            </div>

            <div className={styles.userProgressItem}>
              <div className={`${styles.userMiniAvatar} ${styles.partnerMiniAvatar}`}>
                {partnerName[0].toUpperCase()}
              </div>
              <div className={styles.progressBarContainer}>
                <div className={styles.progressLabel}>
                  <span className={styles.progressLabelName}>{partnerName}</span>
                  <span style={{ color: partnerNetBalance !== null && partnerNetBalance >= 0 ? "#2ee3a8" : "#ff6580", fontWeight: 600 }}>
                    {partnerNetBalance !== null
                      ? new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB", maximumFractionDigits: 0 }).format(partnerNetBalance)
                      : "-"}
                  </span>
                </div>
                <div className={styles.progressBarTrack}>
                  <div className={styles.progressBarFillPartner} style={{ width: userNetBalance !== null && partnerNetBalance !== null && (userNetBalance + partnerNetBalance) > 0 ? `${Math.round((partnerNetBalance / (userNetBalance + partnerNetBalance)) * 100)}%` : "50%" }} />
                </div>
              </div>
            </div>
          </div>

          <div className={styles.coupleSection}>
            <div className={`${styles.coupleIconCircle} ${styles.iconDoc}`}>
              <FileText size={18} />
            </div>
            <div className={styles.coupleMeta}>
              <span className={styles.coupleLabel}>ค่าใช้จ่ายร่วม</span>
              <span className={styles.coupleValue}>
                <Link href="/dashboard/couple" className={styles.coupleLink}>ดูสรุปการแบ่งจ่าย 📋</Link>
              </span>
            </div>
          </div>

          <div className={styles.coupleSection}>
            <div className={`${styles.coupleIconCircle} ${styles.iconTarget}`}>
              <Target size={18} />
            </div>
            <div className={styles.coupleMeta}>
              <span className={styles.coupleLabel}>เป้าหมายร่วม</span>
              <span className={styles.coupleValue}>
                <Link href="/dashboard/goals" className={styles.coupleLink}>
                  {sharedGoalText} ({sharedGoalPercent}%)
                </Link>
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

