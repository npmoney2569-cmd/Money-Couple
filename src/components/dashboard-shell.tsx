"use client";

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
            <LogoutButton />
          </div>
        </header>

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
      </div>
    </div>
  );
}

