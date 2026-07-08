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
};

type CategoryRow = {
  id: string;
  name: string;
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

export async function getDashboardData() {
  const supabase = await createClient();

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
  ] = await Promise.all([
    supabase
      .from("transactions")
      .select("id,type,amount,date,merchant,payee,note,category_id,account_id,created_at")
      .gte("date", sixMonthsAgoStart)
      .lte("date", monthEnd)
      .is("deleted_at", null),
    supabase
      .from("transactions")
      .select("id,type,amount,date,merchant,payee,note,category_id,account_id,created_at")
      .is("deleted_at", null)
      .order("date", { ascending: false })
      .limit(8),
    supabase.from("accounts").select("id,name,balance").eq("is_active", true).order("name"),
    supabase.from("categories").select("id,name"),
    supabase.from("budgets").select("id,amount,period").order("start_date", { ascending: false }).limit(6),
    supabase.from("goals").select("id,name,target_amount,current_amount").order("created_at", { ascending: false }).limit(4),
    supabase.from("debts").select("id,counterparty,principal").order("created_at", { ascending: false }).limit(4),
    supabase.from("assets").select("id,current_value").limit(200),
    supabase
      .from("bills_subscriptions")
      .select("id,name,amount,due_day,type,is_active")
      .eq("is_active", true)
      .order("due_day", { ascending: true })
      .limit(5),
    supabase
      .from("notifications")
      .select("id,title,body,is_read,created_at")
      .order("created_at", { ascending: false })
      .limit(5),
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
    const label = tx.type === "income" ? tx.payee || tx.note || "รายรับ" : tx.merchant || tx.note || "รายจ่าย";
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
    budgetTop,
    goalTop,
    debtTop,
    trendData,
  };
}
