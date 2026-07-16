import styles from "./dashboard.module.css";
import { getDashboardData, thb } from "@/lib/dashboard-data";
import QuickRecordWidget from "@/components/quick-record-widget";
import { BankIcon } from "@/components/bank-icon";
import {
  Wallet,
  ArrowDown,
  ArrowUp,
  PiggyBank,
  HandCoins,
  Scale,
  ArrowDownCircle,
  ArrowUpCircle,
  ArrowLeftRight,
  Receipt,
  Flame,
} from "lucide-react";

function deltaText(value: number) {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}% จากเดือนก่อน`;
}

function formatAxis(val: number) {
  if (val >= 1000000) return `฿${(val / 1000000).toFixed(1)}M`;
  if (val >= 1000) return `฿${(val / 1000).toFixed(0)}k`;
  return `฿${val}`;
}

export default async function DashboardPage() {
  const data = await getDashboardData();

  const trend = data.trendData || [];
  const maxVal = Math.max(...trend.map((d) => Math.max(d.income, d.expense)), 1000);
  const getY = (val: number) => 150 - (val / maxVal) * 110;
  const getX = (index: number) => (index / 5) * 400 + 60;
  const incomePoints = trend.map((d, i) => `${getX(i)},${getY(d.income)}`).join(" ");
  const expensePoints = trend.map((d, i) => `${getX(i)},${getY(d.expense)}`).join(" ");

  const kpis = [
    { title: "เงินคงเหลือทั้งหมด", value: thb(data.kpis.totalBalance), sub: "อัปเดตจากข้อมูลจริง", icon: Wallet, iconColor: "blue" },
    {
      title: "รายรับ (เดือนนี้)",
      value: thb(data.kpis.income),
      sub: deltaText(data.kpis.incomeDelta),
      positive: data.kpis.incomeDelta >= 0,
      icon: ArrowDown,
      iconColor: "green",
    },
    {
      title: "รายจ่าย (เดือนนี้)",
      value: thb(data.kpis.expense),
      sub: deltaText(data.kpis.expenseDelta),
      positive: data.kpis.expenseDelta <= 0,
      icon: ArrowUp,
      iconColor: "red",
    },
    { title: "เงินออม (เดือนนี้)", value: thb(data.kpis.savings), sub: "คำนวณจากรายรับ - รายจ่าย", positive: true, icon: PiggyBank, iconColor: "purple" },
    { title: "หนี้คงค้าง", value: thb(data.kpis.totalDebt), sub: "จากตาราง debts", icon: HandCoins, iconColor: "orange" },
    { title: "Net Worth", value: thb(data.kpis.netWorth), sub: "บัญชี + สินทรัพย์ - หนี้", positive: data.kpis.netWorth >= 0, icon: Scale, iconColor: "cyan" },
    // { title: "Current Streak", value: `${data.gamification.current_streak} วัน`, sub: `Score: ${data.gamification.health_score} | Points: ${data.gamification.points}`, positive: true, icon: Flame, iconColor: "orange" },
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
        {kpis.map((item) => {
          const Icon = item.icon;
          return (
            <article key={item.title} className={`${styles.card} ${styles.kpiCard}`}>
              <div className={`${styles.iconBadge} ${styles[item.iconColor]}`}>
                <Icon size={20} />
              </div>
              <div className={styles.kpiContent}>
                <p className={styles.kpiTitle}>{item.title}</p>
                <p className={styles.kpiValue}>{item.value}</p>
                <p className={`${styles.kpiSub} ${item.positive ? styles.good : ""}`}>{item.sub}</p>
              </div>
            </article>
          );
        })}
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
            <svg viewBox="0 0 500 200" width="100%" height="100%" style={{ overflow: "visible" }}>
              {/* Grid Lines */}
              {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
                const y = getY(maxVal * ratio);
                return (
                  <g key={`grid-${ratio}`}>
                    <line
                      x1="60"
                      y1={y}
                      x2="460"
                      y2={y}
                      stroke="rgba(139, 170, 255, 0.08)"
                      strokeDasharray="4 4"
                    />
                    <text
                      x="50"
                      y={y + 3}
                      fill="#8ab8ff"
                      fontSize="9"
                      textAnchor="end"
                    >
                      {formatAxis(maxVal * ratio)}
                    </text>
                  </g>
                );
              })}

              {/* Trend Lines */}
              {trend.length > 0 && (
                <>
                  <polyline
                    fill="none"
                    stroke="#2ee3a8"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={incomePoints}
                  />
                  <polyline
                    fill="none"
                    stroke="#ff6f8c"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={expensePoints}
                  />
                </>
              )}

              {/* Data Points */}
              {trend.map((d, i) => (
                <g key={`dots-${d.key}`}>
                  <circle cx={getX(i)} cy={getY(d.income)} r="4" fill="#2ee3a8" stroke="#0a2356" strokeWidth="1.5" />
                  <circle cx={getX(i)} cy={getY(d.expense)} r="4" fill="#ff6f8c" stroke="#0a2356" strokeWidth="1.5" />
                </g>
              ))}

              {/* X Axis Labels */}
              {trend.map((d, i) => (
                <text
                  key={`lbl-${d.key}`}
                  x={getX(i)}
                  y="185"
                  fill="#b7cbf6"
                  fontSize="11"
                  textAnchor="middle"
                >
                  {d.name}
                </text>
              ))}
            </svg>
          </div>
        </article>

        <article className={styles.card}>
          <h2 className={styles.sectionTitle}>สัดส่วนรายจ่าย (เดือนนี้)</h2>
          
          <div className={styles.stackedBar}>
            {data.expenseSplit.length === 0 ? (
              <div className={styles.emptyBar} />
            ) : (
              data.expenseSplit.map((item, idx) => {
                const colors = ["#3b82f6", "#10b981", "#f59e0b", "#ec4899", "#8b5cf6", "#6b7280"];
                return (
                  <div
                    key={`segment-${item.name}`}
                    className={styles.barSegment}
                    style={{
                      width: `${item.percent}%`,
                      backgroundColor: colors[idx % colors.length],
                    }}
                    title={`${item.name}: ${item.percent.toFixed(1)}%`}
                  />
                );
              })
            )}
          </div>

          <ul className={styles.list} style={{ marginTop: "16px" }}>
            {data.expenseSplit.length === 0 ? (
              <li className={styles.row}>
                <span>ยังไม่มีข้อมูลรายจ่ายเดือนนี้</span>
                <span>-</span>
              </li>
            ) : (
              data.expenseSplit.map((item, idx) => {
                const colors = ["#3b82f6", "#10b981", "#f59e0b", "#ec4899", "#8b5cf6", "#6b7280"];
                const color = colors[idx % colors.length];
                return (
                  <li key={item.name} className={styles.row}>
                    <div className={styles.rowLeft}>
                      <span className={styles.colorDot} style={{ backgroundColor: color }} />
                      <span className={styles.strong}>{item.name}</span>
                      <span className={styles.kpiSmall}>({item.percent.toFixed(1)}%)</span>
                    </div>
                    <span>{thb(item.amount)}</span>
                  </li>
                );
              })
            )}
          </ul>
        </article>
      </section>

      <section className={styles.threeCol}>
        <article className={styles.card}>
          <h2 className={styles.sectionTitle}>รายการล่าสุด</h2>
          <ul className={styles.list}>
            {data.latestRows.map((tx) => {
              const TxIcon =
                tx.type === "income"
                  ? ArrowDownCircle
                  : tx.type === "transfer"
                  ? ArrowLeftRight
                  : ArrowUpCircle;
              const iconStyle =
                tx.type === "income"
                  ? styles.bgGood
                  : tx.type === "transfer"
                  ? styles.bgBlue
                  : styles.bgBad;
              const amountStyle =
                tx.type === "income"
                  ? styles.good
                  : tx.type === "transfer"
                  ? styles.neutral
                  : styles.bad;
              const amountPrefix =
                tx.type === "income" ? "+" : tx.type === "transfer" ? "" : "-";
              return (
                <li key={tx.id} className={styles.row}>
                  <div className={styles.rowLeft}>
                    <div className={`${styles.rowIcon} ${iconStyle}`}>
                      <TxIcon size={16} />
                    </div>
                    <div>
                      <p className={styles.strong}>{tx.label}</p>
                      <small className={styles.kpiSmall}>{tx.date}</small>
                    </div>
                  </div>
                  <span className={amountStyle}>
                    {amountPrefix}
                    {thb(tx.amount)}
                  </span>
                </li>
              );
            })}
          </ul>
        </article>

        <article className={styles.card}>
          <h2 className={styles.sectionTitle}>บัญชีของฉัน</h2>
          <ul className={styles.list}>
            {data.accounts.map((acc) => (
              <li key={acc.name} className={styles.row}>
                <div className={styles.rowLeft}>
                  <BankIcon preset={acc.bank_preset as string} url={acc.icon_url as string} size={28} />
                  <span style={{ marginLeft: 8 }}>{acc.name}</span>
                </div>
                <span className={Number(acc.balance) < 0 ? styles.bad : styles.strong}>{thb(Number(acc.balance))}</span>
              </li>
            ))}
          </ul>
        </article>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <article className={styles.card}>
            <h2 className={styles.sectionTitle}>บิล / Subscription ใกล้ครบกำหนด</h2>
            <ul className={styles.list}>
              {data.bills.map((bill) => (
                <li key={bill.id} className={styles.row}>
                  <div className={styles.rowLeft}>
                    <div className={`${styles.rowIcon} ${styles.bgPurple}`}>
                      <Receipt size={16} />
                    </div>
                    <div>
                      <p className={styles.strong}>{bill.name}</p>
                      <small className={styles.kpiSmall}>วันที่ {bill.due_day} ของเดือน</small>
                    </div>
                  </div>
                  <span>{thb(Number(bill.amount))}</span>
                </li>
              ))}
            </ul>
          </article>
          <QuickRecordWidget accounts={data.accounts} categories={data.categories} />
        </div>
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
