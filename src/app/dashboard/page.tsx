import styles from "./dashboard.module.css";
import { getDashboardData, thb } from "@/lib/dashboard-data";

function deltaText(value: number) {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}% จากเดือนก่อน`;
}

export default async function DashboardPage() {
  const data = await getDashboardData();

  const kpis = [
    { title: "เงินคงเหลือทั้งหมด", value: thb(data.kpis.totalBalance), sub: "อัปเดตจากข้อมูลจริง" },
    {
      title: "รายรับ (เดือนนี้)",
      value: thb(data.kpis.income),
      sub: deltaText(data.kpis.incomeDelta),
      positive: data.kpis.incomeDelta >= 0,
    },
    {
      title: "รายจ่าย (เดือนนี้)",
      value: thb(data.kpis.expense),
      sub: deltaText(data.kpis.expenseDelta),
      positive: data.kpis.expenseDelta <= 0,
    },
    { title: "เงินออม (เดือนนี้)", value: thb(data.kpis.savings), sub: "คำนวณจากรายรับ - รายจ่าย", positive: true },
    { title: "หนี้คงค้าง", value: thb(data.kpis.totalDebt), sub: "จากตาราง debts" },
    { title: "Net Worth", value: thb(data.kpis.netWorth), sub: "บัญชี + สินทรัพย์ - หนี้", positive: data.kpis.netWorth >= 0 },
  ];

  const maxPie = data.expenseSplit.reduce((m, i) => Math.max(m, i.amount), 0) || 1;

  return (
    <main className={styles.grid}>
      {data.warnings.length > 0 ? (
        <article className={styles.card}>
          <h2 className={styles.sectionTitle}>คำเตือนการเชื่อมต่อข้อมูล</h2>
          <p className={styles.kpiSmall}>
            บางตารางอาจยังไม่มีหรือสิทธิ์ RLS ยังไม่เปิดใช้งาน: {data.warnings.join(" | ")}
          </p>
        </article>
      ) : null}

      <section className={styles.kpiRow}>
        {kpis.map((item) => (
          <article key={item.title} className={styles.card}>
            <p className={styles.kpiTitle}>{item.title}</p>
            <p className={styles.kpiValue}>{item.value}</p>
            <p className={`${styles.kpiSub} ${item.positive ? styles.good : ""}`}>{item.sub}</p>
          </article>
        ))}
      </section>

      <section className={styles.twoCol}>
        <article className={styles.card}>
          <h2 className={styles.sectionTitle}>แนวโน้มรายรับ - รายจ่าย</h2>
          <div className={styles.legend}>
            <span>
              <i className={styles.dot} style={{ background: "#2ee3a8" }} />รายรับ
            </span>
            <span>
              <i className={styles.dot} style={{ background: "#ff6f8c" }} />รายจ่าย
            </span>
          </div>
          <div className={styles.miniChart}>
            <div className={`${styles.line} ${styles.lineIncome}`} />
            <div className={`${styles.line} ${styles.lineExpense}`} />
          </div>
        </article>

        <article className={styles.card}>
          <h2 className={styles.sectionTitle}>สัดส่วนรายจ่าย (เดือนนี้)</h2>
          <div className={styles.pie} />
          <p className={styles.pieCenter}>{thb(data.kpis.expense)} รวม</p>
          <ul className={styles.list}>
            {data.expenseSplit.length === 0 ? (
              <li className={styles.row}>
                <span>ยังไม่มีข้อมูลรายจ่ายเดือนนี้</span>
                <span>-</span>
              </li>
            ) : (
              data.expenseSplit.map((item) => (
                <li key={item.name} className={styles.row}>
                  <span>{item.name}</span>
                  <span>{thb(item.amount)}</span>
                </li>
              ))
            )}
          </ul>
        </article>
      </section>

      <section className={styles.threeCol}>
        <article className={styles.card}>
          <h2 className={styles.sectionTitle}>รายการล่าสุด</h2>
          <ul className={styles.list}>
            {data.latestRows.map((tx) => (
              <li key={tx.id} className={styles.row}>
                <div>
                  <p className={styles.strong}>{tx.label}</p>
                  <small className={styles.kpiSmall}>{tx.date}</small>
                </div>
                <span className={tx.type === "income" ? styles.good : styles.bad}>
                  {tx.type === "income" ? "+" : "-"}
                  {thb(tx.amount)}
                </span>
              </li>
            ))}
          </ul>
        </article>

        <article className={styles.card}>
          <h2 className={styles.sectionTitle}>บัญชีของฉัน</h2>
          <ul className={styles.list}>
            {data.accounts.map((acc) => (
              <li key={acc.name} className={styles.row}>
                <span>{acc.name}</span>
                <span className={Number(acc.balance) < 0 ? styles.bad : styles.strong}>{thb(Number(acc.balance))}</span>
              </li>
            ))}
          </ul>
        </article>

        <article className={styles.card}>
          <h2 className={styles.sectionTitle}>บิล / Subscription ใกล้ครบกำหนด</h2>
          <ul className={styles.list}>
            {data.bills.map((bill) => (
              <li key={bill.id} className={styles.row}>
                <div>
                  <p className={styles.strong}>{bill.name}</p>
                  <small className={styles.kpiSmall}>วันที่ {bill.due_day} ของเดือน</small>
                </div>
                <span>{thb(Number(bill.amount))}</span>
              </li>
            ))}
          </ul>
        </article>
      </section>

      <section className={styles.threeCol}>
        <article className={styles.card}>
          <h2 className={styles.sectionTitle}>เป้าหมายการออม</h2>
          <p className={styles.kpiSmall}>
            {data.goalTop
              ? `${data.goalTop.name}: ${thb(Number(data.goalTop.current_amount))} / ${thb(Number(data.goalTop.target_amount))}`
              : "ยังไม่มีข้อมูล goals"}
          </p>
          <div className={styles.progressWrap}>
            <div
              className={styles.progress}
              style={{
                width: data.goalTop
                  ? `${Math.min((Number(data.goalTop.current_amount) / Math.max(Number(data.goalTop.target_amount), 1)) * 100, 100)}%`
                  : "0%",
              }}
            />
          </div>
        </article>

        <article className={styles.card}>
          <h2 className={styles.sectionTitle}>งบประมาณ (เดือนนี้)</h2>
          <p className={styles.kpiSmall}>
            {data.budgetTop ? `งบ ${data.budgetTop.period}: ${thb(Number(data.budgetTop.amount))}` : "ยังไม่มีข้อมูล budgets"}
          </p>
          <div className={styles.progressWrap}>
            <div
              className={styles.progress}
              style={{ width: data.budgetTop ? `${Math.min((data.kpis.expense / Math.max(Number(data.budgetTop.amount), 1)) * 100, 100)}%` : "0%" }}
            />
          </div>
        </article>

        <article className={styles.card}>
          <h2 className={styles.sectionTitle}>หนี้สินของฉัน</h2>
          <p className={styles.kpiSmall}>
            {data.debtTop ? `${data.debtTop.counterparty}: ${thb(Number(data.debtTop.principal))}` : "ยังไม่มีข้อมูล debts"}
          </p>
          <div className={styles.progressWrap}>
            <div className={styles.progress} style={{ width: `${Math.min((data.kpis.totalDebt / Math.max(data.kpis.totalAssets + data.kpis.totalBalance, 1)) * 100, 100)}%` }} />
          </div>
        </article>
      </section>

      <section className={styles.twoCol}>
        <article className={styles.card}>
          <h2 className={styles.sectionTitle}>การแจ้งเตือนล่าสุด</h2>
          <ul className={styles.list}>
            {data.notifications.length === 0 ? (
              <li className={styles.row}>
                <span>ยังไม่มีการแจ้งเตือน</span>
                <span>-</span>
              </li>
            ) : (
              data.notifications.map((n) => (
                <li key={n.id} className={styles.row}>
                  <div>
                    <p className={styles.strong}>{n.title}</p>
                    <small className={styles.kpiSmall}>{n.body}</small>
                  </div>
                  <span>{n.is_read ? "อ่านแล้ว" : "ใหม่"}</span>
                </li>
              ))
            )}
          </ul>
        </article>

        <article className={styles.card}>
          <h2 className={styles.sectionTitle}>หมวดที่ใช้จ่ายสูงสุด</h2>
          <ul className={styles.list}>
            {data.expenseSplit.map((item) => (
              <li key={`bar-${item.name}`}>
                <div className={styles.row}>
                  <span>{item.name}</span>
                  <span>{item.percent.toFixed(1)}%</span>
                </div>
                <div className={styles.progressWrap}>
                  <div className={styles.progress} style={{ width: `${(item.amount / maxPie) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </article>
      </section>
    </main>
  );
}
