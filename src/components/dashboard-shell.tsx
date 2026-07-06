"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import LogoutButton from "@/components/logout-button";
import styles from "./dashboard-shell.module.css";

type DashboardShellProps = {
  email?: string;
  children: React.ReactNode;
};

type MenuGroup = {
  title: string;
  items: { label: string; href: string }[];
};

const menuGroups: MenuGroup[] = [
  {
    title: "ภาพรวม",
    items: [{ label: "Dashboard", href: "/dashboard" }],
  },
  {
    title: "รายการ",
    items: [
      { label: "รายรับ", href: "/dashboard/income" },
      { label: "รายจ่าย", href: "/dashboard/expense" },
      { label: "โอนเงิน", href: "/dashboard/transfer" },
      { label: "บัญชี", href: "/dashboard/accounts" },
      { label: "หมวดหมู่", href: "/dashboard/categories" },
      { label: "งบประมาณ", href: "/dashboard/budgets" },
      { label: "เป้าหมายการออม", href: "/dashboard/goals" },
      { label: "หนี้สิน", href: "/dashboard/debts" },
      { label: "สินทรัพย์", href: "/dashboard/assets" },
      { label: "บิล / Subscription", href: "/dashboard/subscriptions" },
    ],
  },
  {
    title: "วิเคราะห์",
    items: [
      { label: "รายงาน", href: "/dashboard/reports" },
      { label: "ปฏิทิน", href: "/dashboard/calendar" },
      { label: "ค้นหา / กรอง", href: "/dashboard/search" },
    ],
  },
  {
    title: "อื่นๆ",
    items: [
      { label: "แจ้งเตือน", href: "/dashboard/alerts" },
      { label: "LINE Bot", href: "/dashboard/line" },
      { label: "ตั้งค่า", href: "/dashboard/settings" },
      { label: "ผู้ใช้งาน", href: "/dashboard/users" },
      { label: "ความปลอดภัย", href: "/dashboard/security" },
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
          <span className={styles.brandTitle}>Money Couple</span>
          <span className={styles.brandSub}>บัญชีง่าย ชีวิตสบาย</span>
        </div>

        {menuGroups.map((group) => (
          <section key={group.title}>
            <p className={styles.groupTitle}>{group.title}</p>
            <nav className={styles.menu}>
              {group.items.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className={`${styles.item} ${isActive(item.href) ? styles.active : ""}`.trim()}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </section>
        ))}
      </aside>

      <div className={styles.main}>
        <header className={styles.topbar}>
          <div>
            <h1 className={styles.welcome}>สวัสดีครับ</h1>
            <small>ภาพรวมการเงินของวันนี้</small>
          </div>
          <div className={styles.topRight}>
            <span className={styles.chip}>{email ?? "guest"}</span>
            <LogoutButton />
          </div>
        </header>

        <div className={styles.content}>{children}</div>
      </div>

      <div className={styles.mobileNav}>
        <Link href="/dashboard" className={styles.mobileItem}>
          ภาพรวม
        </Link>
        <Link href="/dashboard/income" className={styles.mobileItem}>
          รายรับ
        </Link>
        <Link href="/dashboard/expense" className={styles.mobileItem}>
          รายจ่าย
        </Link>
        <Link href="/dashboard/accounts" className={styles.mobileItem}>
          บัญชี
        </Link>
      </div>
    </div>
  );
}
