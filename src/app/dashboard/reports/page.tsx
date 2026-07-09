import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import styles from "./reports.module.css";
import PrintButton from "./PrintButton";

type TransactionRow = {
  id: string;
  date: string;
  type: string;
  amount: number | string;
  category_id: string | null;
  account_id: string | null;
  merchant: string | null;
  payee: string | null;
  note: string | null;
  source: string | null;
};

type CategoryRow = {
  id: string;
  name: string;
};

type AccountRow = {
  id: string;
  name: string;
  balance: number | string;
};

type DailyTrend = {
  date: string;
  label: string;
  net: number;
  income: number;
  expense: number;
};

function num(value: number | string | null | undefined) {
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value) || 0;
  return 0;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    maximumFractionDigits: 2,
  }).format(value);
}

function diffLabel(current: number, prev: number): { text: string; positive: boolean } | null {
  if (prev === 0) return null;
  const pct = ((current - prev) / prev) * 100;
  const sign = pct >= 0 ? "+" : "";
  return { text: `${sign}${pct.toFixed(1)}%`, positive: pct >= 0 };
}

export default async function ReportsPage() {
  const supabase = await createClient();
  const now = new Date();

  // Current month range
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);

  // Previous month range (MoM)
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 10);
  const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().slice(0, 10);
  const prevMonthName = new Date(now.getFullYear(), now.getMonth() - 1, 1).toLocaleDateString("th-TH", { month: "long", year: "numeric" });

  // Current & previous year range (YoY)
  const yearStart = new Date(now.getFullYear(), 0, 1).toISOString().slice(0, 10);
  const yearEnd = new Date(now.getFullYear(), 11, 31).toISOString().slice(0, 10);
  const prevYearStart = new Date(now.getFullYear() - 1, 0, 1).toISOString().slice(0, 10);
  const prevYearEnd = new Date(now.getFullYear() - 1, 11, 31).toISOString().slice(0, 10);

  const [txRes, prevTxRes, yearTxRes, prevYearTxRes, catRes, accountsRes] = await Promise.all([
    supabase.from("transactions").select("id,date,type,amount,category_id,account_id,merchant,payee,note,source")
      .gte("date", monthStart).lte("date", monthEnd).is("deleted_at", null).order("date", { ascending: false }),
    supabase.from("transactions").select("type,amount")
      .gte("date", prevMonthStart).lte("date", prevMonthEnd).is("deleted_at", null),
    supabase.from("transactions").select("type,amount")
      .gte("date", yearStart).lte("date", yearEnd).is("deleted_at", null),
    supabase.from("transactions").select("type,amount")
      .gte("date", prevYearStart).lte("date", prevYearEnd).is("deleted_at", null),
    supabase.from("categories").select("id,name"),
    supabase.from("accounts").select("id,name,balance").eq("is_active", true),
  ]);

  const transactions = (txRes.data ?? []) as TransactionRow[];
  const prevTx = (prevTxRes.data ?? []) as { type: string; amount: number | string }[];
  const yearTx = (yearTxRes.data ?? []) as { type: string; amount: number | string }[];
  const prevYearTx = (prevYearTxRes.data ?? []) as { type: string; amount: number | string }[];
  const categories = (catRes.data ?? []) as CategoryRow[];
  const accounts = (accountsRes.data ?? []) as AccountRow[];

  // Current month totals
  const totalIncome = transactions.filter((tx) => tx.type === "income").reduce((sum, tx) => sum + num(tx.amount), 0);
  const totalExpense = transactions.filter((tx) => tx.type === "expense").reduce((sum, tx) => sum + num(tx.amount), 0);
  const netSavings = totalIncome - totalExpense;
  const transactionCount = transactions.length;
  const averageDailyExpense = totalExpense / Math.max(1, new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate());
  const incomeCoverage = totalIncome > 0 ? Math.min(1, totalExpense / totalIncome) : 0;

  // MoM prev
  const prevIncome = prevTx.filter((tx) => tx.type === "income").reduce((s, tx) => s + num(tx.amount), 0);
  const prevExpense = prevTx.filter((tx) => tx.type === "expense").reduce((s, tx) => s + num(tx.amount), 0);

  // YoY
  const yearIncome = yearTx.filter((tx) => tx.type === "income").reduce((s, tx) => s + num(tx.amount), 0);
  const yearExpense = yearTx.filter((tx) => tx.type === "expense").reduce((s, tx) => s + num(tx.amount), 0);
  const prevYearIncome = prevYearTx.filter((tx) => tx.type === "income").reduce((s, tx) => s + num(tx.amount), 0);
  const prevYearExpense = prevYearTx.filter((tx) => tx.type === "expense").reduce((s, tx) => s + num(tx.amount), 0);

  const momIncomeDiff = diffLabel(totalIncome, prevIncome);
  const momExpenseDiff = diffLabel(totalExpense, prevExpense);
  const yoyIncomeDiff = diffLabel(yearIncome, prevYearIncome);
  const yoyExpenseDiff = diffLabel(yearExpense, prevYearExpense);

  const categoryMap = new Map(categories.map((category) => [category.id, category.name]));
  const accountMap = new Map(accounts.map((account) => [account.id, account.name]));
  const expenseByCategory = new Map<string, number>();

  transactions.filter((tx) => tx.type === "expense").forEach((tx) => {
    const name = tx.category_id ? categoryMap.get(tx.category_id) ?? "ไม่ระบุหมวดหมู่" : "ไม่ระบุหมวดหมู่";
    expenseByCategory.set(name, (expenseByCategory.get(name) ?? 0) + num(tx.amount));
  });

  const categoryStats = Array.from(expenseByCategory.entries())
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 6);

  const maxCategory = Math.max(...categoryStats.map((item) => item.amount), 1);

  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const dayMap = new Map<string, { income: number; expense: number }>();
  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(now.getFullYear(), now.getMonth(), day).toISOString().slice(0, 10);
    dayMap.set(date, { income: 0, expense: 0 });
  }

  transactions.forEach((tx) => {
    const totals = dayMap.get(tx.date);
    if (!totals) return;
    if (tx.type === "income") totals.income += num(tx.amount);
    else if (tx.type === "expense") totals.expense += num(tx.amount);
  });

  const trendPoints: DailyTrend[] = Array.from(dayMap.entries()).map(([date, totals]) => ({
    date,
    label: date.slice(-2),
    net: totals.income - totals.expense,
    income: totals.income,
    expense: totals.expense,
  }));
  const maxTrendValue = Math.max(...trendPoints.map((point) => Math.abs(point.net)), 1);

  const currentMonthLabel = now.toLocaleDateString("th-TH", { month: "long", year: "numeric" });

  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <div className={styles.header}>
          <div>
            <h1>รายงาน</h1>
            <p>สรุปผลทางการเงิน พร้อม MoM · YoY · Export CSV · PDF</p>
          </div>
          <div className={styles.actionsGroup}>
            <Link href="/api/reports/export" className={styles.exportButton}>
              Export CSV รายเดือน
            </Link>
            <form className={styles.rangeForm} method="GET" action="/api/reports/range">
              <label className={styles.hiddenLabel} htmlFor="start">เริ่มต้น</label>
              <input id="start" name="start" type="date" defaultValue={monthStart} className={styles.dateInput} />
              <label className={styles.hiddenLabel} htmlFor="end">สิ้นสุด</label>
              <input id="end" name="end" type="date" defaultValue={monthEnd} className={styles.dateInput} />
              <button type="submit" className={styles.exportButtonSecondary}>Export ช่วงเวลา</button>
            </form>
            <PrintButton />
          </div>
        </div>

        {/* Stats */}
        <div className={styles.stats}>
          <article className={styles.statCard}>
            <p className={styles.statTitle}>รายรับเดือนนี้</p>
            <p className={styles.statValue}>{formatCurrency(totalIncome)}</p>
          </article>
          <article className={styles.statCard}>
            <p className={styles.statTitle}>รายจ่ายเดือนนี้</p>
            <p className={styles.statValue}>{formatCurrency(totalExpense)}</p>
          </article>
          <article className={styles.statCard}>
            <p className={styles.statTitle}>เงินออมสุทธิ</p>
            <p className={styles.statValue}>{formatCurrency(netSavings)}</p>
          </article>
          <article className={styles.statCard}>
            <p className={styles.statTitle}>จำนวนรายการ</p>
            <p className={styles.statValue}>{transactionCount}</p>
          </article>
          <article className={styles.statCard}>
            <p className={styles.statTitle}>รายจ่ายเฉลี่ย/วัน</p>
            <p className={styles.statValue}>{formatCurrency(averageDailyExpense)}</p>
          </article>
          <article className={styles.statCard}>
            <p className={styles.statTitle}>สัดส่วนรายจ่าย/รายรับ</p>
            <p className={styles.statValue}>{(incomeCoverage * 100).toFixed(1)}%</p>
          </article>
        </div>

        {/* MoM Comparison */}
        <div className={styles.compareSection}>
          <h2 className={styles.compareTitle}>📈 Month-over-Month (MoM)</h2>
          <p className={styles.compareSubtitle}>{currentMonthLabel} เทียบกับ {prevMonthName}</p>
          <div className={styles.compareGrid}>
            <div className={styles.compareCard}>
              <p className={styles.compareLabel}>รายรับ</p>
              <p className={styles.compareValue}>{formatCurrency(totalIncome)}</p>
              <p className={styles.comparePrev}>เดือนก่อน: {formatCurrency(prevIncome)}</p>
              {momIncomeDiff && (
                <span className={`${styles.diffBadge} ${momIncomeDiff.positive ? styles.diffPositive : styles.diffNegative}`}>
                  {momIncomeDiff.text}
                </span>
              )}
            </div>
            <div className={styles.compareCard}>
              <p className={styles.compareLabel}>รายจ่าย</p>
              <p className={styles.compareValue}>{formatCurrency(totalExpense)}</p>
              <p className={styles.comparePrev}>เดือนก่อน: {formatCurrency(prevExpense)}</p>
              {momExpenseDiff && (
                <span className={`${styles.diffBadge} ${!momExpenseDiff.positive ? styles.diffPositive : styles.diffNegative}`}>
                  {momExpenseDiff.text}
                </span>
              )}
            </div>
            <div className={styles.compareCard}>
              <p className={styles.compareLabel}>ออมสุทธิ</p>
              <p className={styles.compareValue}>{formatCurrency(netSavings)}</p>
              <p className={styles.comparePrev}>เดือนก่อน: {formatCurrency(prevIncome - prevExpense)}</p>
            </div>
          </div>
        </div>

        {/* YoY Comparison */}
        <div className={styles.compareSection}>
          <h2 className={styles.compareTitle}>📊 Year-over-Year (YoY)</h2>
          <p className={styles.compareSubtitle}>ปี {now.getFullYear()} เทียบกับปี {now.getFullYear() - 1}</p>
          <div className={styles.compareGrid}>
            <div className={styles.compareCard}>
              <p className={styles.compareLabel}>รายรับทั้งปี</p>
              <p className={styles.compareValue}>{formatCurrency(yearIncome)}</p>
              <p className={styles.comparePrev}>ปีก่อน: {formatCurrency(prevYearIncome)}</p>
              {yoyIncomeDiff && (
                <span className={`${styles.diffBadge} ${yoyIncomeDiff.positive ? styles.diffPositive : styles.diffNegative}`}>
                  {yoyIncomeDiff.text}
                </span>
              )}
            </div>
            <div className={styles.compareCard}>
              <p className={styles.compareLabel}>รายจ่ายทั้งปี</p>
              <p className={styles.compareValue}>{formatCurrency(yearExpense)}</p>
              <p className={styles.comparePrev}>ปีก่อน: {formatCurrency(prevYearExpense)}</p>
              {yoyExpenseDiff && (
                <span className={`${styles.diffBadge} ${!yoyExpenseDiff.positive ? styles.diffPositive : styles.diffNegative}`}>
                  {yoyExpenseDiff.text}
                </span>
              )}
            </div>
            <div className={styles.compareCard}>
              <p className={styles.compareLabel}>ออมสุทธิทั้งปี</p>
              <p className={styles.compareValue}>{formatCurrency(yearIncome - yearExpense)}</p>
              <p className={styles.comparePrev}>ปีก่อน: {formatCurrency(prevYearIncome - prevYearExpense)}</p>
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className={styles.charts}>
          <div className={styles.trendPanel}>
            <div className={styles.trendHeader}>
              <h2>เทรนด์รายวัน</h2>
              <p>เปรียบเทียบยอดรับ-จ่ายทุกวันของเดือนนี้</p>
            </div>
            <div className={styles.trendGrid}>
              {trendPoints.map((point) => {
                const height = Math.min(100, (Math.abs(point.net) / maxTrendValue) * 100);
                const isPositive = point.net >= 0;
                return (
                  <div key={point.date} className={styles.trendItem}>
                    <div className={styles.trendBarWrapper}>
                      <div className={styles.trendBarBackground} />
                      <div
                        className={styles.trendBar}
                        style={{
                          height: `${height}%`,
                          backgroundColor: isPositive ? "#2ee3a8" : "#ff6580",
                        }}
                        title={`${point.label}: ${formatCurrency(point.net)}`}
                      />
                    </div>
                    <span className={styles.trendLabel}>{point.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className={styles.categoryPanel}>
            <h2>หมวดรายจ่ายสูงสุด</h2>
            {categoryStats.length === 0 ? (
              <p className={styles.empty}>ยังไม่มีข้อมูลรายจ่ายเดือนนี้</p>
            ) : (
              <div className={styles.barList}>
                {categoryStats.map((item) => (
                  <div key={item.name} className={styles.barRow}>
                    <div>
                      <p className={styles.barLabel}>{item.name}</p>
                      <p className={styles.barMeta}>{formatCurrency(item.amount)}</p>
                    </div>
                    <div className={styles.barTrack}>
                      <div className={styles.barFill} style={{ width: `${(item.amount / maxCategory) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className={styles.accountPanel}>
            <h2>ยอดบัญชีที่ใช้งาน</h2>
            {accounts.length === 0 ? (
              <p className={styles.empty}>ยังไม่มีบัญชีที่เปิดใช้งาน</p>
            ) : (
              <ul className={styles.accountList}>
                {accounts.map((account) => (
                  <li key={account.id} className={styles.accountRow}>
                    <span>{account.name}</span>
                    <strong>{formatCurrency(num(account.balance))}</strong>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Transaction table */}
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>วันที่</th>
                <th>ประเภท</th>
                <th>จำนวนเงิน</th>
                <th>หมวดหมู่</th>
                <th>บัญชี</th>
                <th>รายละเอียด</th>
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={6}>ไม่พบข้อมูล</td>
                </tr>
              ) : (
                transactions.map((row) => {
                  return (
                    <tr key={row.id}>
                      <td>{row.date}</td>
                      <td>{row.type}</td>
                      <td>{formatCurrency(num(row.amount))}</td>
                      <td>{row.category_id ? (categoryMap.get(row.category_id) ?? "-") : "-"}</td>
                      <td>{row.account_id ? (accountMap.get(row.account_id) ?? "-") : "-"}</td>
                      <td>{row.note ?? row.merchant ?? row.payee ?? row.source ?? "-"}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
