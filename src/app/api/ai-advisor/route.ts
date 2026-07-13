import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { GoogleGenAI } from "@google/genai";

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet: { name: string; value: string; options: any }[]) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {}
          },
        },
      }
    );

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "No Gemini API key configured" }, { status: 500 });
    }

    // 1. Fetch User Data
    const userId = session.user.id;
    
    // Get this month's start and end date in YYYY-MM-DD
    const d = new Date();
    const utc = d.getTime() + d.getTimezoneOffset() * 60000;
    const thDate = new Date(utc + 3600000 * 7);
    const year = thDate.getFullYear();
    const month = String(thDate.getMonth() + 1).padStart(2, "0");
    const startOfMonth = `${year}-${month}-01`;
    const today = `${year}-${month}-${String(thDate.getDate()).padStart(2, "0")}`;

    const [ { data: txs }, { data: budgets }, { data: accounts } ] = await Promise.all([
      supabase.from("transactions").select("amount, type, date, note, categories(name)").eq("user_id", userId).gte("date", startOfMonth).lte("date", today).is("deleted_at", null),
      supabase.from("budgets").select("amount, categories(name)").eq("user_id", userId),
      supabase.from("accounts").select("name, balance").eq("user_id", userId)
    ]);

    // 2. Prepare context for AI
    let totalIncome = 0;
    let totalExpense = 0;
    const expenseByCategory: Record<string, number> = {};

    txs?.forEach(tx => {
      const amt = Number(tx.amount);
      if (tx.type === "income") {
        totalIncome += amt;
      } else {
        totalExpense += amt;
        const catName = (Array.isArray(tx.categories) ? tx.categories[0]?.name : (tx.categories as any)?.name) || "อื่นๆ";
        expenseByCategory[catName] = (expenseByCategory[catName] || 0) + amt;
      }
    });

    const budgetContext = budgets?.map(b => {
       const catName = (Array.isArray(b.categories) ? b.categories[0]?.name : (b.categories as any)?.name) || "ทั่วไป";
       const spent = expenseByCategory[catName] || 0;
       return `- งบหมวด ${catName}: ตั้งงบ ${b.amount} บาท, ใช้ไปแล้ว ${spent} บาท`;
    }).join('\n') || "ไม่มีการตั้งงบประมาณ";

    const accountContext = accounts?.map(a => `- บัญชี ${a.name}: ยอดเงิน ${a.balance} บาท`).join('\n') || "ไม่มีข้อมูลบัญชี";

    const topCategories = Object.entries(expenseByCategory)
      .sort((a, b) => b[1] - a[1])
      .map(entry => `- ${entry[0]}: ${entry[1]} บาท`)
      .slice(0, 5)
      .join('\n');

    const prompt = `You are an expert personal financial advisor for a Thai user. 
    Analyze the user's financial data for the current month and write a helpful, insightful, and beautifully formatted markdown report in Thai.
    
    Here is the user's data for this month (up to today ${today}):
    - Total Income: ${totalIncome} THB
    - Total Expense: ${totalExpense} THB
    - Net Balance (Month): ${totalIncome - totalExpense} THB
    
    Current Account Balances:
    ${accountContext}
    
    Budgets set by the user:
    ${budgetContext}
    
    Top 5 Spending Categories this month:
    ${topCategories}
    
    Please provide the response entirely in THAI using Markdown formatting. 
    Structure your report exactly like this:
    
    ## 📊 สรุปพฤติกรรมการใช้จ่าย
    (Explain their spending habits this month. Are they spending too much on something? Are they saving well?)
    
    ## 🔮 คาดการณ์สิ้นเดือน (Forecast)
    (Based on the days passed in this month, project if they will have positive or negative cash flow by the end of the month. Use simple math in your head based on the current date: ${today}.)
    
    ## 💡 คำแนะนำทางการเงินจาก AI
    (Provide 2-3 bullet points of highly actionable and personalized advice based on their specific budget vs actual spending, or their top spending categories.)
    
    Use bold text, emojis, and bullet points to make it engaging and easy to read. Do not use code blocks for the whole text, just regular markdown text.`;

    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt
    });

    let resultText = response.text || "ไม่สามารถสร้างคำแนะนำได้ในขณะนี้";

    return NextResponse.json({ markdown: resultText });

  } catch (err: any) {
    console.error("AI Advisor error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
