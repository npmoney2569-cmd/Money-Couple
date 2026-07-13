import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const maxDuration = 60; // Max execution time 60 seconds

// Helper: send push message via LINE
async function pushLineMessage(lineUserId: string, text: string) {
  const token = process.env.LINE_BOT_CHANNEL_ACCESS_TOKEN;
  if (!token) return;

  try {
    await fetch("https://api.line.me/v2/bot/message/push", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        to: lineUserId,
        messages: [{ type: "text", text }],
      }),
    });
  } catch (err) {
    console.error("Failed to send LINE push:", err);
  }
}

export async function GET(request: Request) {
  // 1. Verify Vercel Cron Secret (if configured)
  const authHeader = request.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const supabase = createAdminClient();
  const today = new Date();
  
  // Use Thailand time for logic
  const utc = today.getTime() + today.getTimezoneOffset() * 60000;
  const thDate = new Date(utc + 3600000 * 7);
  
  const currentDay = thDate.getDate();
  const currentMonthStart = new Date(thDate.getFullYear(), thDate.getMonth(), 1).toISOString();
  
  let alertsSent = 0;

  try {
    // 2. Fetch Active Bills
    const { data: bills, error: billsErr } = await supabase
      .from("bills_subscriptions")
      .select("id, user_id, name, amount, due_day, remind_days_before")
      .eq("is_active", true);

    if (billsErr) throw billsErr;

    if (bills && bills.length > 0) {
      for (const bill of bills) {
        // Check if due_day is approaching (or today)
        const dueDay = bill.due_day;
        const remindDays = bill.remind_days_before || 3;
        
        let shouldAlert = false;
        
        // Handle wrap-around for short months if needed, but simple logic first:
        if (currentDay >= dueDay - remindDays && currentDay <= dueDay) {
          shouldAlert = true;
        }

        if (shouldAlert) {
          // Check if we already alerted this user for this bill THIS MONTH
          const { data: existingNotif } = await supabase
            .from("notifications")
            .select("id")
            .eq("user_id", bill.user_id)
            .eq("type", "bill_due")
            .like("title", `%${bill.name}%`)
            .gte("created_at", currentMonthStart)
            .limit(1);

          if (!existingNotif || existingNotif.length === 0) {
            // Create notification
            const title = `แจ้งเตือนบิล: ${bill.name}`;
            const body = `บิลรายการ "${bill.name}" ยอด ฿${Number(bill.amount).toLocaleString()} ใกล้ถึงกำหนดชำระ (วันที่ ${dueDay} ของเดือน)`;
            
            await supabase.from("notifications").insert([{
              user_id: bill.user_id,
              type: "bill_due",
              title,
              body,
              sent_via: "line"
            }]);

            // Attempt to send via LINE
            const { data: linkData } = await supabase
              .from("auth_providers")
              .select("line_user_id")
              .eq("provider", "line")
              .eq("user_id", bill.user_id)
              .maybeSingle();

            if (linkData?.line_user_id) {
              await pushLineMessage(linkData.line_user_id, `🔔 ${title}\n\n${body}`);
            }

            alertsSent++;
          }
        }
      }
    }

    // (Future) 3. Fetch Budgets to check if exceeded...
    
    return NextResponse.json({ success: true, alertsSent });
    
  } catch (err: any) {
    console.error("Cron Error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
