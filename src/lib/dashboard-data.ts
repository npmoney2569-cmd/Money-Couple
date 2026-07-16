import { createClient } from "@/lib/supabase/server";

type TxRow = {
  id: string;
  type: "income" | "expense" | "transfer";
  amount: number | string;
  date: string;
  merchant: string | null;
  payee: string | null;
  note: string | null;
  category_id: string | null;
  account_id: string | null;
  created_at?: string;
};

type AccountRow = {
  id: string;
  name: string;
  balance: number | string;
  bank_preset?: string | null;
  icon_url?: string | null;
};

type CategoryRow = {
  id: string;
  name: string;
  type: string;
};

type BillRow = {
  id: string;
  name: string;
  amount: number | string;
  due_day: number;
  type: string;
  is_active: boolean;
};

type GoalRow = {
  id: string;
  name: string;
  target_amount: number | string;
  current_amount: number | string;
};

type DebtRow = {
  id: string;
  counterparty: string;
  principal: number | string;
};

type NotificationRow = {
  id: string;
  title: string;
  body: string;
  is_read: boolean;
  created_at: string;
};

function num(value: number | string | null | undefined) {
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value) || 0;
  return 0;
}

export function thb(value: number) {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    maximumFractionDigits: 2,
  }).format(value);
}

function percent(current: number, prev: number) {
  if (prev === 0) return 0;
  return ((current - prev) / Math.abs(prev)) * 100;
}

async function checkAndCreateBillAlerts(supabase: any, userId: string) {
  try {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth(); // 0-indexed
    const todayDay = today.getDate();

    // Fetch active bills and subscriptions for the user
    const { data: bills, error: billsError } = await supabase
      .from("bills_subscriptions")
      .select("id, name, amount, type, due_day, remind_days_before")
      .eq("user_id", userId)
      .eq("is_active", true);

    if (billsError || !bills) return;

    const THAI_MONTHS_SHORT = [
      "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
      "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."
    ];

    for (const bill of bills) {
      const dueDay = bill.due_day;
      const remindDays = bill.remind_days_before || 3;

      // Determine due date in this month or next month
      let dueYear = currentYear;
      let dueMonth = currentMonth;

      if (todayDay > dueDay) {
        if (currentMonth === 11) {
          dueMonth = 0;
          dueYear = currentYear + 1;
        } else {
          dueMonth = currentMonth + 1;
        }
      }

      const dueDate = new Date(dueYear, dueMonth, dueDay);
      const diffTime = dueDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays >= 0 && diffDays <= remindDays) {
        const dueDateStr = `${dueDay} ${THAI_MONTHS_SHORT[dueMonth]} ${dueYear + 543}`;
        const typeLabel = bill.type === "subscription" ? "บริการรายเดือน" : "บิล";

        const { data: existingNotif } = await supabase
          .from("notifications")
          .select("id")
          .eq("user_id", userId)
          .eq("type", "bill_due")
          .like("body", `%${bill.name}%`)
          .like("body", `%${dueDateStr}%`)
          .limit(1);

        if (!existingNotif || existingNotif.length === 0) {
          await supabase.from("notifications").insert([{
            user_id: userId,
            type: "bill_due",
            title: `เตือนกำหนดชำระ ${typeLabel}! 📅`,
            body: `${typeLabel} "${bill.name}" ยอดชำระ ฿${Number(bill.amount).toLocaleString("th-TH", { minimumFractionDigits: 2 })} ใกล้ครบกำหนดในวันที่ ${dueDateStr}`,
            sent_via: "push",
            is_read: false
          }]);
        }
      }
    }
  } catch (e) {
    console.error("Error in checkAndCreateBillAlerts:", e);
  }
}

export async function getDashboardData() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    await checkAndCreateBillAlerts(supabase, user.id);
  }

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 10);
  const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().slice(0, 10);
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const sixMonthsAgoStart = sixMonthsAgo.toISOString().slice(0, 10);

  const [
    txRes,
    latestTxRes,
    accountsRes,
    categoriesRes,
    budgetsRes,
    goalsRes,
    debtsRes,
    assetsRes,
    billsRes,
    notificationsRes,
    gamificationRes,
  ] = await Promise.all([
    supabase
      .from("transactions")
      .select("id,type,amount,date,merchant,payee,note,category_id,account_id,created_at")
      .eq("user_id", user?.id ?? "")
      .gte("date", sixMonthsAgoStart)
      .lte("date", monthEnd)
      .is("deleted_at", null),
    supabase
      .from("transactions")
      .select("id,type,amount,date,merchant,payee,note,category_id,account_id,created_at")
      .eq("user_id", user?.id ?? "")
      .is("deleted_at", null)
      .order("date", { ascending: false })
      .limit(8),
    supabase.from("accounts").select("id,name,balance,bank_preset,icon_url").eq("is_active", true).eq("user_id", user?.id ?? "").order("name"),
    supabase.from("categories").select("id,name,type"), // categories uses RLS for user_id and preset
    supabase.from("budgets").select("id,amount,period").eq("user_id", user?.id ?? "").order("start_date", { ascending: false }).limit(6),
    supabase.from("goals").select("id,name,target_amount,current_amount").eq("user_id", user?.id ?? "").order("created_at", { ascending: false }).limit(4),
    supabase.from("debts").select("id,counterparty,principal").eq("user_id", user?.id ?? "").order("created_at", { ascending: false }).limit(4),
    supabase.from("assets").select("id,current_value").eq("user_id", user?.id ?? "").limit(200),
    supabase
      .from("bills_subscriptions")
      .select("id,name,amount,due_day,type,is_active")
      .eq("user_id", user?.id ?? "")
      .eq("is_active", true)
      .order("due_day", { ascending: true })
      .limit(5),
    supabase
      .from("notifications")
      .select("id,title,body,is_read,created_at")
      .eq("user_id", user?.id ?? "")
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("gamification_stats")
      .select("current_streak,health_score,points")
      .eq("user_id", user?.id ?? "")
      .maybeSingle(),
  ]);

  const warnings: string[] = [];
  const collect = (name: string, error: { message: string } | null) => {
    if (error) warnings.push(`${name}: ${error.message}`);
  };

  collect("transactions(6months)", txRes.error);
  collect("transactions(latest)", latestTxRes.error);
  collect("accounts", accountsRes.error);
  collect("categories", categoriesRes.error);
  collect("budgets", budgetsRes.error);
  collect("goals", goalsRes.error);
  collect("debts", debtsRes.error);
  collect("assets", assetsRes.error);
  collect("bills_subscriptions", billsRes.error);
  collect("notifications", notificationsRes.error);
  collect("gamification", gamificationRes.error);

  const allTx = (txRes.data ?? []) as TxRow[];
  const currentTx = allTx.filter((t) => t.date >= monthStart && t.date <= monthEnd);
  const prevTx = allTx.filter((t) => t.date >= prevMonthStart && t.date <= prevMonthEnd);
  const latestTx = (latestTxRes.data ?? []) as TxRow[];
  const accounts = (accountsRes.data ?? []) as AccountRow[];
  const categories = (categoriesRes.data ?? []) as CategoryRow[];
  const budgets = budgetsRes.data ?? [];
  const goals = (goalsRes.data ?? []) as GoalRow[];
  const debts = (debtsRes.data ?? []) as DebtRow[];
  const assets = (assetsRes.data ?? []) as Array<{ current_value: number | string }>;
  const bills = (billsRes.data ?? []) as BillRow[];
  const notifications = (notificationsRes.data ?? []) as NotificationRow[];
  const gamification = gamificationRes.data ?? { current_streak: 0, health_score: 50, points: 0 };

  const income = currentTx.filter((t) => t.type === "income").reduce((s, t) => s + num(t.amount), 0);
  const expense = currentTx.filter((t) => t.type === "expense").reduce((s, t) => s + num(t.amount), 0);
  const prevIncome = prevTx.filter((t) => t.type === "income").reduce((s, t) => s + num(t.amount), 0);
  const prevExpense = prevTx.filter((t) => t.type === "expense").reduce((s, t) => s + num(t.amount), 0);

  const savings = Math.max(income - expense, 0);
  const totalBalance = accounts.reduce((s, a) => s + num(a.balance), 0);
  const totalDebt = debts.reduce((s, d) => s + num(d.principal), 0);
  const totalAssets = assets.reduce((s, a) => s + num(a.current_value), 0);
  const netWorth = totalBalance + totalAssets - totalDebt;

  const categoryMap = new Map(categories.map((c) => [c.id, c.name]));
  const expenseByCategory = new Map<string, number>();

  for (const tx of currentTx.filter((t) => t.type === "expense")) {
    const key = tx.category_id ? categoryMap.get(tx.category_id) ?? "ไม่ระบุหมวดหมู่" : "ไม่ระบุหมวดหมู่";
    expenseByCategory.set(key, (expenseByCategory.get(key) ?? 0) + num(tx.amount));
  }

  const expenseSplit = Array.from(expenseByCategory.entries())
    .map(([name, amount]) => ({
      name,
      amount,
      percent: expense > 0 ? (amount / expense) * 100 : 0,
    }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  const latestRows = latestTx.map((tx) => {
    let label: string;
    if (tx.type === "income") {
      label = tx.payee || tx.note || "รายรับ";
    } else if (tx.type === "transfer") {
      label = tx.note || "โอนเงิน";
    } else {
      label = tx.merchant || tx.note || "รายจ่าย";
    }
    const amount = num(tx.amount);
    return {
      id: tx.id,
      label,
      date: tx.date,
      type: tx.type,
      amount,
    };
  });

  const trendData = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthKey = d.toISOString().slice(0, 7); // "YYYY-MM"
    const monthName = d.toLocaleDateString("th-TH", { month: "short" });
    trendData.push({
      key: monthKey,
      name: monthName,
      income: 0,
      expense: 0,
    });
  }

  for (const tx of allTx) {
    const txMonth = tx.date.slice(0, 7); // "YYYY-MM"
    const monthData = trendData.find((t) => t.key === txMonth);
    if (monthData) {
      if (tx.type === "income") {
        monthData.income += num(tx.amount);
      } else if (tx.type === "expense") {
        monthData.expense += num(tx.amount);
      }
    }
  }

  const budgetTop = (budgets as Array<{ amount: number | string; period: string }>)[0];
  const goalTop = goals[0];
  const debtTop = debts[0];

  return {
    warnings,
    kpis: {
      totalBalance,
      income,
      expense,
      savings,
      totalDebt,
      totalAssets,
      netWorth,
      incomeDelta: percent(income, prevIncome),
      expenseDelta: percent(expense, prevExpense),
    },
    accounts,
    latestRows,
    expenseSplit,
    bills,
    notifications,
    categories,
    budgetTop,
    goalTop,
    debtTop,
    trendData,
    gamification,
  };
}
