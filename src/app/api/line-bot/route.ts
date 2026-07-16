import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { GoogleGenAI } from "@google/genai";

// Helper to calculate Thailand date (UTC+7)
function getThDate(): Date {
  const d = new Date();
  const utc = d.getTime() + d.getTimezoneOffset() * 60000;
  return new Date(utc + 3600000 * 7);
}

// Helper to download image from LINE
async function getLineImageBuffer(messageId: string): Promise<{ buffer: Buffer; mimeType: string } | null> {
  const token = process.env.LINE_BOT_CHANNEL_ACCESS_TOKEN;
  if (!token) return null;
  try {
    const res = await fetch(`https://api-data.line.me/v2/bot/message/${messageId}/content`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const mimeType = res.headers.get("content-type") || "image/jpeg";
    const arrayBuffer = await res.arrayBuffer();
    return { buffer: Buffer.from(arrayBuffer), mimeType };
  } catch (e) {
    console.error("Error fetching LINE image", e);
    return null;
  }
}

// Helper to reply back to LINE user
async function replyMessage(replyToken: string, text: string, quickReplyItems?: any[]) {
  const channelAccessToken = process.env.LINE_BOT_CHANNEL_ACCESS_TOKEN || "";
  if (!channelAccessToken) {
    console.error("LINE BOT: Missing LINE_BOT_CHANNEL_ACCESS_TOKEN. Cannot reply.");
    return;
  }

  try {
    const messageObj: any = {
      type: "text",
      text: text,
    };

    if (quickReplyItems && quickReplyItems.length > 0) {
      messageObj.quickReply = {
        items: quickReplyItems,
      };
    }

    const response = await fetch("https://api.line.me/v2/bot/message/reply", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${channelAccessToken}`,
      },
      body: JSON.stringify({
        replyToken,
        messages: [messageObj],
      }),
    });

    if (!response.ok) {
      const err = await response.json();
      console.error("LINE BOT Reply failed:", err);
    }
  } catch (error) {
    console.error("LINE BOT Reply network error:", error);
  }
}

export async function POST(request: NextRequest) {
  const channelSecret = process.env.LINE_BOT_CHANNEL_SECRET || "";
  const bodyText = await request.text();

  // 1. Verify LINE Signature
  const signature = request.headers.get("x-line-signature");
  if (channelSecret && signature) {
    const computedSignature = crypto
      .createHmac("sha256", channelSecret)
      .update(bodyText)
      .digest("base64");

    if (computedSignature !== signature) {
      console.error("LINE BOT: Invalid webhook signature");
      return new NextResponse("Unauthorized", { status: 401 });
    }
  } else if (channelSecret && !signature) {
    console.error("LINE BOT: Signature header is missing");
    return new NextResponse("Unauthorized", { status: 401 });
  }

  // 2. Parse events
  let body;
  try {
    body = JSON.parse(bodyText);
  } catch (err) {
    return new NextResponse("Bad Request", { status: 400 });
  }

  const events = body.events || [];
  const supabase = createAdminClient();

  for (const event of events) {
    const messageType = event?.message?.type;
    if (event.type !== "message" || (messageType !== "text" && messageType !== "image")) {
      continue;
    }

    const replyToken = event.replyToken;
    const lineUserId = event.source.userId;
    const userMessage = messageType === "text" ? event.message.text.trim() : "";

    if (!lineUserId || !replyToken) continue;

    // 3. Resolve user_id from auth_providers linked with LINE
    const { data: linkData, error: linkError } = await supabase
      .from("auth_providers")
      .select("user_id")
      .eq("provider", "line")
      .eq("line_user_id", lineUserId)
      .maybeSingle();

    if (linkError) {
      console.error("LINE BOT: Database query error mapping provider:", linkError.message);
    }

    const userId = linkData?.user_id;

    if (!userId) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3008";
      await replyMessage(
        replyToken,
        `ขออภัยครับ บัญชี LINE นี้ยังไม่ได้เชื่อมโยงกับระบบ Money Couple\n\nกรุณาเข้าสู่ระบบด้วย LINE ที่เว็บไซต์ของแอปก่อนการใช้งานครับ:\n${appUrl}/login`
      );
      continue;
    }

    try {
      // 4. Command Router

      // Command A: Delete recent transaction e.g., "ลบ #1"
      const deleteMatch = messageType === "text" ? userMessage.match(/^ลบ\s*#([1-5])$/i) : null;
      if (deleteMatch) {
        const index = parseInt(deleteMatch[1], 10) - 1; // 0-indexed index

        // Fetch last 5 transactions
        const { data: txs, error: txsError } = await supabase
          .from("transactions")
          .select("id, amount, note, type, categories(name)")
          .eq("user_id", userId)
          .is("deleted_at", null)
          .order("created_at", { ascending: false })
          .limit(5);

        if (txsError || !txs || txs.length === 0) {
          await replyMessage(replyToken, "ไม่พบรายการธุรกรรมล่าสุดของคุณครับ");
          continue;
        }

        if (index >= txs.length) {
          await replyMessage(replyToken, `ไม่พบรายการอันดับที่ #${index + 1} ในระบบประวัติล่าสุดครับ`);
          continue;
        }

        const targetTx = txs[index];
        const categoryName = (Array.isArray(targetTx.categories) ? targetTx.categories[0]?.name : (targetTx.categories as any)?.name) || (targetTx.type === "income" ? "รายได้อื่น" : "อื่นๆ");

        // Soft delete transaction
        const { error: delError } = await supabase
          .from("transactions")
          .update({ deleted_at: new Date().toISOString() })
          .eq("id", targetTx.id);

        if (delError) {
          throw delError;
        }

        await replyMessage(
          replyToken,
          `❌ ลบรายการสำเร็จเรียบร้อยแล้วครับ!\n\nรายการ: ${targetTx.type === "income" ? "รายรับ 🟢" : "รายจ่าย 🔴"}\nหมวดหมู่: ${categoryName}\nจำนวนเงิน: ฿${Number(targetTx.amount).toLocaleString()}\nโน้ต: ${targetTx.note || "-"}`
        );
        continue;
      }

      // Command B: Report / Summary e.g., "สรุป", "สรุปวันนี้", "สรุปเดือนนี้"
      const lowerMsg = messageType === "text" ? userMessage.toLowerCase() : "";
      if (lowerMsg === "สรุป" || lowerMsg === "สรุปวันนี้" || lowerMsg === "สรุปเดือนนี้" || lowerMsg === "summary" || lowerMsg === "report") {
        const thDate = getThDate();
        const todayStr = thDate.toISOString().split("T")[0];
        const monthStartStr = todayStr.substring(0, 8) + "01";

        // Query today's transactions
        const { data: todayTxs } = await supabase
          .from("transactions")
          .select("amount, type")
          .eq("user_id", userId)
          .eq("date", todayStr)
          .is("deleted_at", null);

        let todayIncome = 0;
        let todayExpense = 0;
        todayTxs?.forEach((t) => {
          if (t.type === "income") todayIncome += Number(t.amount);
          else if (t.type === "expense") todayExpense += Number(t.amount);
        });

        // Query this month's transactions
        const { data: monthTxs } = await supabase
          .from("transactions")
          .select("amount, type")
          .eq("user_id", userId)
          .gte("date", monthStartStr)
          .lte("date", todayStr)
          .is("deleted_at", null);

        let monthIncome = 0;
        let monthExpense = 0;
        monthTxs?.forEach((t) => {
          if (t.type === "income") monthIncome += Number(t.amount);
          else if (t.type === "expense") monthExpense += Number(t.amount);
        });

        const monthName = thDate.toLocaleString("th-TH", { month: "long" });

        const summaryText = `📊 สรุปยอดบัญชี Money Couple

📅 วันนี้ (${thDate.toLocaleDateString("th-TH")}):
🟢 รายรับ: ฿${todayIncome.toLocaleString()}
🔴 รายจ่าย: ฿${todayExpense.toLocaleString()}
💵 คงเหลือ: ฿${(todayIncome - todayExpense).toLocaleString()}

📅 เดือนนี้ (${monthName}):
🟢 รายรับ: ฿${monthIncome.toLocaleString()}
🔴 รายจ่าย: ฿${monthExpense.toLocaleString()}
💵 คงเหลือ: ฿${(monthIncome - monthExpense).toLocaleString()}`;

        await replyMessage(replyToken, summaryText);
        continue;
      }

      // Command C: History list e.g., "รายการ", "ล่าสุด", "ประวัติ"
      if (lowerMsg === "รายการ" || lowerMsg === "ล่าสุด" || lowerMsg === "ประวัติ" || lowerMsg === "history") {
        const { data: txs, error: txsError } = await supabase
          .from("transactions")
          .select("amount, type, date, note, categories(name)")
          .eq("user_id", userId)
          .is("deleted_at", null)
          .order("created_at", { ascending: false })
          .limit(5);

        if (txsError || !txs || txs.length === 0) {
          await replyMessage(replyToken, "ยังไม่มีประวัติรายการธุรกรรมครับ");
          continue;
        }

        let historyText = `📋 รายการล่าสุดของคุณ (5 ลำดับแรก):\n\n`;
        txs.forEach((tx, i) => {
          const typeSign = tx.type === "income" ? "🟢" : "🔴";
          const cat = (Array.isArray(tx.categories) ? tx.categories[0]?.name : (tx.categories as any)?.name) || (tx.type === "income" ? "รายได้อื่น" : "อื่นๆ");
          const noteText = tx.note ? ` (${tx.note})` : "";
          const dateObj = new Date(tx.date);
          const dateStr = dateObj.toLocaleDateString("th-TH", { day: "2-digit", month: "2-digit" });

          historyText += `#${i + 1}: ${dateStr} ${typeSign} ${cat}${noteText} | ฿${Number(tx.amount).toLocaleString()}\n`;
        });
        historyText += `\n💡 พิมพ์ "ลบ #1" เพื่อลบรายการล่าสุดอันดับแรกสุด`;

        await replyMessage(replyToken, historyText);
        continue;
      }

      // Command F: Account Balance — "ยอดบัญชี", "ยอดเงิน", "บัญชี"
      const balanceKeywords = ["ยอดบัญชี", "ยอดเงิน", "บัญชี", "balance", "เงินคงเหลือ"];
      if (messageType === "text" && balanceKeywords.includes(lowerMsg)) {
        const { data: balanceAccounts } = await supabase
          .from("accounts")
          .select("id, name, balance")
          .eq("user_id", userId)
          .eq("is_active", true)
          .order("name");

        if (!balanceAccounts || balanceAccounts.length === 0) {
          await replyMessage(replyToken, "ยังไม่มีบัญชีในระบบครับ กรุณาสร้างบัญชีบนแอปก่อนครับ");
          continue;
        }

        const totalBalance = balanceAccounts.reduce((sum, acc) => sum + Number(acc.balance), 0);
        let balanceText = `💳 ยอดเงินในบัญชีทั้งหมด\n\n`;
        balanceAccounts.forEach((acc) => {
          const bal = Number(acc.balance);
          const emoji = bal >= 0 ? "🟢" : "🔴";
          balanceText += `${emoji} ${acc.name}\n   ฿${bal.toLocaleString("th-TH", { minimumFractionDigits: 2 })}\n\n`;
        });
        balanceText += `─────────────────\n💰 รวมทั้งหมด: ฿${totalBalance.toLocaleString("th-TH", { minimumFractionDigits: 2 })}`;

        await replyMessage(replyToken, balanceText);
        continue;
      }

      // Command G: Category Summary — "สรุปหมวด", "หมวด", "หมวดหมู่"
      const categoryKeywords = ["สรุปหมวด", "หมวด", "หมวดหมู่", "category", "ค่าใช้จ่ายหมวด"];
      if (messageType === "text" && categoryKeywords.includes(lowerMsg)) {
        const thDateG = getThDate();
        const todayStrG = thDateG.toISOString().split("T")[0];
        const monthStartStrG = todayStrG.substring(0, 8) + "01";
        const monthNameG = thDateG.toLocaleString("th-TH", { month: "long" });

        const { data: catTxs } = await supabase
          .from("transactions")
          .select("amount, type, categories(name)")
          .eq("user_id", userId)
          .eq("type", "expense")
          .gte("date", monthStartStrG)
          .lte("date", todayStrG)
          .is("deleted_at", null);

        if (!catTxs || catTxs.length === 0) {
          await replyMessage(replyToken, `ยังไม่มีรายจ่ายในเดือน${monthNameG}ครับ`);
          continue;
        }

        const catMap: Record<string, number> = {};
        catTxs.forEach((tx) => {
          const catName =
            (Array.isArray(tx.categories) ? tx.categories[0]?.name : (tx.categories as any)?.name) || "ไม่ระบุหมวดหมู่";
          catMap[catName] = (catMap[catName] || 0) + Number(tx.amount);
        });

        const sortedCats = Object.entries(catMap).sort((a, b) => b[1] - a[1]);
        const totalCatExpense = sortedCats.reduce((s, [, v]) => s + v, 0);

        let catText = `📊 สรุปรายจ่ายตามหมวดหมู่\nเดือน${monthNameG}\n\n`;
        sortedCats.slice(0, 8).forEach(([name, amount], i) => {
          const pct = totalCatExpense > 0 ? ((amount / totalCatExpense) * 100).toFixed(0) : "0";
          const barLen = Math.min(Math.round(Number(pct) / 10), 10);
          const bar = "█".repeat(barLen) + "░".repeat(10 - barLen);
          catText += `${i + 1}. ${name}\n   ฿${amount.toLocaleString()} (${pct}%)\n   ${bar}\n`;
        });
        catText += `\n─────────────────\n💸 รวมรายจ่าย: ฿${totalCatExpense.toLocaleString()}`;

        await replyMessage(replyToken, catText);
        continue;
      }

      // Command H: Extended period summary — "สรุปเมื่อวาน", "สรุปสัปดาห์", "สรุปเดือนที่แล้ว"
      const yesterdayKeys = ["สรุปเมื่อวาน", "เมื่อวาน", "yesterday"];
      const weekKeys = ["สรุปสัปดาห์", "สัปดาห์นี้", "สัปดาห์", "week", "7วัน"];
      const lastMonthKeys = ["สรุปเดือนที่แล้ว", "เดือนที่แล้ว", "lastmonth"];
      const periodKeys = [...yesterdayKeys, ...weekKeys, ...lastMonthKeys];
      if (messageType === "text" && periodKeys.includes(lowerMsg)) {
        const thDateH = getThDate();
        let startStrH = "";
        let endStrH = "";
        let periodLabel = "";

        if (yesterdayKeys.includes(lowerMsg)) {
          const yesterday = new Date(thDateH);
          yesterday.setDate(yesterday.getDate() - 1);
          startStrH = yesterday.toISOString().split("T")[0];
          endStrH = startStrH;
          periodLabel = `เมื่อวาน (${yesterday.toLocaleDateString("th-TH", { day: "2-digit", month: "long" })})`;
        } else if (weekKeys.includes(lowerMsg)) {
          const weekAgo = new Date(thDateH);
          weekAgo.setDate(weekAgo.getDate() - 6);
          startStrH = weekAgo.toISOString().split("T")[0];
          endStrH = thDateH.toISOString().split("T")[0];
          periodLabel = "7 วันที่ผ่านมา";
        } else {
          const lastMonthDate = new Date(thDateH.getFullYear(), thDateH.getMonth() - 1, 1);
          const lastMonthEnd = new Date(thDateH.getFullYear(), thDateH.getMonth(), 0);
          startStrH = lastMonthDate.toISOString().split("T")[0];
          endStrH = lastMonthEnd.toISOString().split("T")[0];
          periodLabel = `เดือน${lastMonthDate.toLocaleString("th-TH", { month: "long" })}`;
        }

        const { data: periodTxs } = await supabase
          .from("transactions")
          .select("amount, type")
          .eq("user_id", userId)
          .gte("date", startStrH)
          .lte("date", endStrH)
          .is("deleted_at", null);

        let pIncome = 0;
        let pExpense = 0;
        periodTxs?.forEach((t) => {
          if (t.type === "income") pIncome += Number(t.amount);
          else if (t.type === "expense") pExpense += Number(t.amount);
        });

        const pNet = pIncome - pExpense;
        const netEmoji = pNet >= 0 ? "🟢" : "🔴";
        await replyMessage(
          replyToken,
          `📊 สรุป${periodLabel}\n\n🟢 รายรับ: ฿${pIncome.toLocaleString()}\n🔴 รายจ่าย: ฿${pExpense.toLocaleString()}\n${netEmoji} คงเหลือ: ฿${pNet.toLocaleString()}`
        );
        continue;
      }

      // Command I: Transfer — "โอน 500", "โอน 500 กสิก ออมทรัพย์", "โอน 500 จาก กสิก ไป ออมทรัพย์"
      const transferMatch = messageType === "text"
        ? userMessage.match(/^โอน\s+([\d,]+(?:\.\d+)?)(?:\s+(.+))?$/i)
        : null;

      if (transferMatch) {
        const transferAmount = parseFloat(transferMatch[1].replace(/,/g, ""));
        const restText = (transferMatch[2] || "").trim();

        if (isNaN(transferAmount) || transferAmount <= 0) {
          await replyMessage(replyToken, "กรุณาระบุจำนวนเงินให้ถูกต้องครับ เช่น \"โอน 500\"");
          continue;
        }

        const { data: transferAccounts } = await supabase
          .from("accounts")
          .select("id, name")
          .eq("user_id", userId)
          .eq("is_active", true)
          .order("name");

        if (!transferAccounts || transferAccounts.length < 2) {
          await replyMessage(replyToken, "ต้องมีบัญชีอย่างน้อย 2 บัญชีเพื่อโอนเงินได้ครับ กรุณาสร้างบัญชีเพิ่มบนแอปก่อนครับ");
          continue;
        }

        // Fuzzy-match FROM and TO from restText
        let fromAcc: { id: string; name: string } | null = null;
        let toAcc: { id: string; name: string } | null = null;

        if (restText) {
          const parts = restText
            .replace(/จาก|ไปยัง|ไป|->|→/g, "|")
            .split("|")
            .map((s) => s.trim())
            .filter((s) => s.length > 0);

          if (parts.length >= 2) {
            fromAcc = transferAccounts.find(
              (a) => a.name.toLowerCase().includes(parts[0].toLowerCase()) || parts[0].toLowerCase().includes(a.name.toLowerCase())
            ) || null;
            toAcc = transferAccounts.find(
              (a) => a.name.toLowerCase().includes(parts[1].toLowerCase()) || parts[1].toLowerCase().includes(a.name.toLowerCase())
            ) || null;
          }
        }

        // Both accounts identified → insert directly
        if (fromAcc && toAcc) {
          if (fromAcc.id === toAcc.id) {
            await replyMessage(replyToken, "❌ บัญชีต้นทางและปลายทางห้ามเป็นบัญชีเดียวกันครับ");
            continue;
          }
          const thDateI = getThDate();
          const todayStrI = thDateI.toISOString().split("T")[0];
          const { error: insertTransferErr } = await supabase.from("transactions").insert([{
            user_id: userId, type: "transfer", amount: transferAmount,
            date: todayStrI, account_id: fromAcc.id, to_account_id: toAcc.id,
            note: restText || null, source: "line_bot",
          }]);
          if (insertTransferErr) {
            await replyMessage(replyToken, `เกิดข้อผิดพลาดในการโอนเงิน: ${insertTransferErr.message}`);
            continue;
          }
          await replyMessage(
            replyToken,
            `✅ บันทึกโอนเงินสำเร็จ!\n\n💸 ยอดโอน: ฿${transferAmount.toLocaleString()}\n📤 จากบัญชี: ${fromAcc.name}\n📥 ไปยังบัญชี: ${toAcc.name}\n\n💡 พิมพ์ "ลบ #1" หากต้องการลบรายการนี้`
          );
          continue;
        }

        // Cannot auto-match both → use 2-step quick reply flow
        const thDateI = getThDate();
        const expiresAtI = new Date(thDateI.getTime() + 10 * 60 * 1000).toISOString();

        if (fromAcc) {
          // FROM known, ask for TO
          await supabase.from("line_pending_transactions").upsert({
            line_user_id: lineUserId, user_id: userId, type: "transfer", amount: transferAmount,
            category_id: null, category_name: "โอนเงิน",
            note: `TRANSFER_FROM:${fromAcc.id}:${fromAcc.name}`, expires_at: expiresAtI,
          }, { onConflict: "line_user_id" });

          const toQR = transferAccounts
            .filter((a) => a.id !== fromAcc!.id)
            .map((acc) => ({ type: "action", action: { type: "message", label: acc.name.substring(0, 20), text: `เลือกบัญชี: ${acc.name}` } }));

          await replyMessage(replyToken, `📤 บัญชีต้นทาง: ${fromAcc.name}\n💸 จำนวน: ฿${transferAmount.toLocaleString()}\n\nเลือกบัญชีปลายทาง (บัญชีที่รับเงิน):`, toQR);
          continue;
        }

        // FROM unknown → ask for FROM first
        await supabase.from("line_pending_transactions").upsert({
          line_user_id: lineUserId, user_id: userId, type: "transfer", amount: transferAmount,
          category_id: null, category_name: "โอนเงิน",
          note: "TRANSFER_STEP1", expires_at: expiresAtI,
        }, { onConflict: "line_user_id" });

        const fromQR = transferAccounts.map((acc) => ({
          type: "action",
          action: { type: "message", label: acc.name.substring(0, 20), text: `เลือกบัญชี: ${acc.name}` },
        }));

        await replyMessage(replyToken, `💸 โอนเงิน ฿${transferAmount.toLocaleString()}\n\nเลือกบัญชีต้นทาง (บัญชีที่ถูกหักเงิน):`, fromQR);
        continue;
      }

      // Command E: Confirm Pending Account Select e.g., "เลือกบัญชี: บัญชีเงินฝากออมทรัพย์"
      const accountMatch = messageType === "text" ? userMessage.match(/^(?:เลือกบัญชี|บันทึกเข้าบัญชี)[:\s]+(.+)$/i) : null;
      if (accountMatch) {
        const targetAccountName = accountMatch[1].trim();

        // 1. Fetch pending transaction for this LINE user (not expired)
        const nowIso = new Date().toISOString();
        const { data: pendingTx, error: pendingErr } = await supabase
          .from("line_pending_transactions")
          .select("*")
          .eq("line_user_id", lineUserId)
          .gte("expires_at", nowIso)
          .maybeSingle();

        if (pendingErr) {
          console.error("LINE BOT: Failed to fetch pending transaction", pendingErr.message);
        }

        if (!pendingTx) {
          await replyMessage(
            replyToken,
            "❌ ไม่พบรายการที่รอการบันทึก หรือรายการอาจหมดอายุแล้ว (มีอายุ 10 นาที) กรุณาพิมพ์ทำรายการใหม่อีกครั้งครับ"
          );
          continue;
        }

        // 2. Fetch matched account for this user
        const { data: accountData, error: accountErr } = await supabase
          .from("accounts")
          .select("id, name")
          .eq("user_id", userId)
          .eq("name", targetAccountName)
          .maybeSingle();

        if (accountErr) {
          console.error("LINE BOT: Failed to query account", accountErr.message);
        }

        if (!accountData) {
          // If account name doesn't match, ask user again with quick replies
          const { data: userAccounts } = await supabase
            .from("accounts")
            .select("id, name")
            .eq("user_id", userId)
            .eq("is_active", true)
            .order("created_at", { ascending: true });

          const quickReplies = userAccounts?.map((acc) => ({
            type: "action",
            action: {
              type: "message",
              label: acc.name.substring(0, 20), // LINE label limit is 20 chars
              text: `เลือกบัญชี: ${acc.name}`,
            },
          })) || [];

          await replyMessage(
            replyToken,
            `❌ ไม่พบชื่อบัญชี "${targetAccountName}" ในระบบ\n\nกรุณาเลือกบัญชีการเงินที่ถูกต้องจากตัวเลือกด้านล่างครับ:`,
            quickReplies
          );
          continue;
        }

        // 3. Handle TRANSFER special 2-step flow
        if (pendingTx.type === "transfer") {
          const pendingNote = pendingTx.note || "";

          if (pendingNote === "TRANSFER_STEP1") {
            // User selected FROM → update pending and ask for TO
            const expiresAtNext = new Date(Date.now() + 10 * 60 * 1000).toISOString();
            await supabase
              .from("line_pending_transactions")
              .update({ note: `TRANSFER_FROM:${accountData.id}:${accountData.name}`, expires_at: expiresAtNext })
              .eq("id", pendingTx.id);

            const { data: remainingAccounts } = await supabase
              .from("accounts")
              .select("id, name")
              .eq("user_id", userId)
              .eq("is_active", true)
              .neq("id", accountData.id)
              .order("name");

            const toQR = remainingAccounts?.map((acc) => ({
              type: "action",
              action: { type: "message", label: acc.name.substring(0, 20), text: `เลือกบัญชี: ${acc.name}` },
            })) || [];

            await replyMessage(
              replyToken,
              `📤 บัญชีต้นทาง: ${accountData.name}\n💸 จำนวน: ฿${Number(pendingTx.amount).toLocaleString()}\n\nเลือกบัญชีปลายทาง (บัญชีที่รับเงิน):`,
              toQR
            );
            continue;
          }

          if (pendingNote.startsWith("TRANSFER_FROM:")) {
            // User selected TO → insert transfer transaction
            const noteParts = pendingNote.split(":");
            const fromAccountId = noteParts[1];
            const fromAccountName = noteParts.slice(2).join(":");

            if (fromAccountId === accountData.id) {
              await replyMessage(replyToken, "❌ บัญชีต้นทางและปลายทางห้ามเป็นบัญชีเดียวกันครับ กรุณาเลือกบัญชีอื่น");
              continue;
            }

            const thDateTr = getThDate();
            const todayStrTr = thDateTr.toISOString().split("T")[0];
            const { error: transferInsertErr } = await supabase.from("transactions").insert([{
              user_id: userId, type: "transfer", amount: pendingTx.amount,
              date: todayStrTr, account_id: fromAccountId, to_account_id: accountData.id,
              note: null, source: "line_bot",
            }]);

            if (transferInsertErr) {
              await replyMessage(replyToken, `เกิดข้อผิดพลาดในการโอนเงิน: ${transferInsertErr.message}`);
              continue;
            }

            await supabase.from("line_pending_transactions").delete().eq("id", pendingTx.id);
            await replyMessage(
              replyToken,
              `✅ บันทึกโอนเงินสำเร็จ!\n\n💸 ยอดโอน: ฿${Number(pendingTx.amount).toLocaleString()}\n📤 จากบัญชี: ${fromAccountName}\n📥 ไปยังบัญชี: ${accountData.name}\n\n💡 พิมพ์ "ลบ #1" หากต้องการลบรายการนี้`
            );
            continue;
          }
        }

        // 4. Insert real transaction (income / expense)
        const thDate = getThDate();
        const todayStr = thDate.toISOString().split("T")[0];

        const { error: insertError } = await supabase
          .from("transactions")
          .insert([
            {
              user_id: pendingTx.user_id,
              type: pendingTx.type,
              amount: pendingTx.amount,
              date: todayStr,
              account_id: accountData.id,
              category_id: pendingTx.category_id,
              note: pendingTx.note !== pendingTx.category_name ? pendingTx.note : null,
              source: "line_bot",
            },
          ]);

        if (insertError) {
          console.error("LINE BOT: Failed to insert transaction", insertError.message);
          await replyMessage(replyToken, `เกิดข้อผิดพลาดในการบันทึกรายการ: ${insertError.message}`);
          continue;
        }

        // 5. Delete pending record
        await supabase
          .from("line_pending_transactions")
          .delete()
          .eq("id", pendingTx.id);

        await replyMessage(
          replyToken,
          `✅ บันทึกรายการสำเร็จ!
ประเภท: ${pendingTx.type === "income" ? "รายรับ 🟢" : "รายจ่าย 🔴"}
ยอดเงิน: ฿${Number(pendingTx.amount).toLocaleString()}
หมวดหมู่: ${pendingTx.category_name || "ไม่มี"}
บัญชี: ${accountData.name}
โน้ต: ${pendingTx.note || "-"}

💡 พิมพ์ "ลบ #1" หากต้องการลบรายการนี้`
        );
        continue;
      }

      // Command D: Quick Record transaction (AI Powered)
      
      // 1. Fetch user's categories and accounts for AI context
      const [ { data: cats }, { data: accounts } ] = await Promise.all([
        supabase.from("categories").select("id, name, type").or(`user_id.eq.${userId},user_id.is.null`),
        supabase.from("accounts").select("id, name").eq("user_id", userId).eq("is_active", true).order("created_at", { ascending: true })
      ]);

      if (!accounts || accounts.length === 0) {
        await replyMessage(replyToken, "ไม่พบบัญชีเงินในระบบ กรุณาสร้างบัญชีบนแอปก่อนใช้งานครับ");
        continue;
      }

      let apiKey = process.env.GEMINI_API_KEY;
      let aiError: string | null = null; // track AI error reason
      let amount = 0;
      let type: "income" | "expense" = "expense";
      let matchedCategory = null;
      let targetAccount = null;
      let cleanText = userMessage || "สลิป/ใบเสร็จ";

      if (apiKey) {
        // AI Parsing Path
        const ai = new GoogleGenAI({ apiKey });
        const categoriesList = cats?.map(c => `- ${c.name} (type: ${c.type})`).join('\n') || '';
        const accountsList = accounts?.map(a => `- ${a.name}`).join('\n') || '';
        
        let prompt = `You are a smart Thai personal finance assistant.
Available Categories:
${categoriesList}

Available Accounts:
${accountsList}

Rules:
1. Identify the transaction amount as a number.
2. Determine if it's "expense" (default) or "income".
3. Find the best matching category name from the list. If none fits perfectly, pick the closest one (e.g., "ชา" -> "อาหารและเครื่องดื่ม"). If really unsure, use null.
4. If the user mentions a payment method (e.g., "เงินสด", "บัตรเครดิต", "kbank"), match it to the Available Accounts. Otherwise, use null.
5. Provide a short "note" describing the item (e.g., "ข้าวราดแกง").
6. Respond ONLY with a raw JSON object (no markdown, no backticks).

JSON format:
{
  "amount": number,
  "type": "expense" | "income",
  "category_name": string | null,
  "account_name": string | null,
  "note": string
}`;

        try {
          let aiParts: any[] = [];
          
          if (messageType === "image") {
             const imageResult = await getLineImageBuffer(event.message.id);
             if (!imageResult) {
            const msg = "ขออภัยครับ ไม่สามารถดาวน์โหลดรูปจาก LINE ได้ กรุณาลองส่งใหม่หรือพิมพ์รายการด้วยตนเอง";
            await replyMessage(replyToken, msg);
            continue;
          }
          
          prompt = prompt + `\n\nPlease extract the transaction details from this receipt or bank slip image.`;
             aiParts = [
               { text: prompt },
               { inlineData: { mimeType: imageResult.mimeType, data: imageResult.buffer.toString("base64") } }
             ];
          } else {
             prompt = prompt + `\n\nParse this user message: "${userMessage}"`;
             aiParts = [{ text: prompt }];
          }

          // contents ต้องอยู่ใน format { role, parts } ของ @google/genai SDK
          const aiContents = [{ role: "user", parts: aiParts }];

          // Retry logic for transient 503/UNAVAILABLE errors
          const maxRetries = 2;
          let attempt = 0;
          let response;
          while (attempt <= maxRetries) {
            try {
              response = await ai.models.generateContent({
                model: 'gemini-3.5-flash',
                contents: aiContents
              });
              break; // success
            } catch (retryErr: any) {
              attempt++;
              const retryMsg = retryErr?.message || String(retryErr);
              const isUnavailable = retryMsg.includes('UNAVAILABLE') || retryMsg.includes('503');
              if (isUnavailable && attempt <= maxRetries) {
                console.warn(`Gemini unavailable (attempt ${attempt}/${maxRetries}), retrying...`);
                // simple delay before retry
                await new Promise(res => setTimeout(res, 1000 * attempt));
                continue;
              }
              // other errors or max retries reached
              throw retryErr;
            }
          }
          // If all retries failed and no response received
          if (!response) {
            console.error('Gemini unavailable after retries');
            const fallbackMsg = "ขออภัยครับ ระบบ AI กำลังใช้งานเต็ม โปรดลองใหม่อีกครั้งในภายหลัง หรือพิมพ์รายการด้วยตนเอง";
            await replyMessage(replyToken, fallbackMsg);
            continue; // skip further processing for this event
          }
          
          const rawText = (response?.text || "").trim();
          const jsonText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
          const parsed = JSON.parse(jsonText);

          amount = parseFloat(parsed.amount);
          type = parsed.type === "income" ? "income" : "expense";
          cleanText = parsed.note || userMessage;
          
          if (parsed.category_name) {
             matchedCategory = cats?.find(c => c.name.toLowerCase() === parsed.category_name.toLowerCase()) || null;
          }
          if (parsed.account_name) {
             targetAccount = accounts?.find(a => a.name.toLowerCase() === parsed.account_name.toLowerCase()) || null;
          }
        } catch (aiErr: any) {
          console.error("LINE BOT AI Parsing Error:", aiErr);
          aiError = aiErr?.message || String(aiErr);
          // Fallback if AI fails
          apiKey = ""; // Trigger fallback
        }
      }

      if (!apiKey || isNaN(amount) || amount <= 0) {
        if (messageType === "image") {
          const originalApiKey = process.env.GEMINI_API_KEY;
          let imageErrMsg: string;
          if (!originalApiKey) {
            // ไม่มี API Key ตั้งแต่ต้น
            console.error("LINE BOT: GEMINI_API_KEY is not set. Cannot process image.");
            imageErrMsg = "ขออภัยครับ ระบบยังไม่ได้ตั้งค่า API Key สำหรับอ่านรูปภาพ กรุณาติดต่อผู้ดูแลระบบครับ";
          } else if (aiError) {
            // API Key มีแต่ AI error — แยกกรณี quota หมด
            console.error("LINE BOT: AI failed to process image. Error:", aiError);
            const isQuotaError = aiError.includes("429") || aiError.includes("RESOURCE_EXHAUSTED") || aiError.includes("quota");
            if (isQuotaError) {
              imageErrMsg = "ขออภัยครับ ระบบ AI ถึงขีดจำกัดการใช้งานฟรีแล้ว กรุณาพิมพ์รายการด้วยตัวเองแทนได้เลยครับ เช่น \"ค่าข้าว 150\"";
            } else {
              imageErrMsg = `[DEBUG] ${aiError.substring(0, 300)}`;
            }
          } else {
            // AI อ่านได้แต่ได้ amount เป็น 0 หรือ NaN (ไม่พบตัวเลขในรูป)
            console.warn("LINE BOT: AI processed image but could not extract a valid amount.");
            imageErrMsg = "ขออภัยครับ AI อ่านรูปแล้วแต่ไม่พบยอดเงินในภาพ กรุณาลองส่งรูปสลิปหรือใบเสร็จที่ชัดกว่านี้ครับ";
          }
          await replyMessage(replyToken, imageErrMsg);
          continue;
        }

        // Legacy Pattern Parsing Path (Fallback)
        const cleanInput = userMessage.replace(/,/g, "");
        const amountMatch = cleanInput.match(/(\d+(?:\.\d+)?)/);
        if (!amountMatch) {
          await replyMessage(
            replyToken,
            `💡 คำแนะนำการใช้งานแชทบอท:\n\n📝 บันทึกรายการ:\n• รายจ่าย: พิมพ์ชื่อตามด้วยราคา (เช่น 'ค่าข้าว 150')\n• รายรับ: พิมพ์ 'รายรับ' นำหน้า (เช่น 'รายรับ เงินเดือน 30000')\n• โอนเงิน: พิมพ์ 'โอน 500' หรือ 'โอน 500 กสิก ออมทรัพย์'\n\n📊 ดูข้อมูล:\n• 'สรุป' — สรุปวันนี้และเดือนนี้\n• 'สรุปเมื่อวาน' — สรุปเมื่อวาน\n• 'สรุปสัปดาห์' — สรุป 7 วันที่ผ่านมา\n• 'สรุปเดือนที่แล้ว' — สรุปเดือนที่แล้ว\n• 'สรุปหมวด' — รายจ่ายแยกตามหมวดหมู่\n• 'ยอดบัญชี' — ดูยอดเงินทุกบัญชี\n• 'ล่าสุด' — ดูประวัติ 5 รายการล่าสุด\n\n🗑️ จัดการ:\n• 'ลบ #1' — ลบรายการล่าสุดอันดับแรก`
          );
          continue;
        }

        amount = parseFloat(amountMatch[1]);
        const textPart = cleanInput.replace(amountMatch[0], "").trim();

        if (!textPart) {
          await replyMessage(replyToken, `กรุณาระบุรายละเอียดรายการด้วยครับ เช่น 'ค่าอาหาร ${amount}'`);
          continue;
        }

        const incomeKeywords = ["รายรับ", "รายได้", "ได้เงิน", "รับเงิน", "เงินเดือน", "income"];
        for (const keyword of incomeKeywords) {
          if (textPart.toLowerCase().startsWith(keyword)) {
            type = "income";
            cleanText = textPart.substring(keyword.length).trim();
            break;
          } else if (textPart.toLowerCase().endsWith(keyword)) {
            type = "income";
            cleanText = textPart.substring(0, textPart.length - keyword.length).trim();
            break;
          }
        }

        const expenseKeywords = ["รายจ่าย", "จ่าย", "ซื้อ", "ค่า", "expense"];
        for (const keyword of expenseKeywords) {
          if (cleanText.toLowerCase().startsWith(keyword) && cleanText.length > keyword.length) {
            if (keyword === "จ่าย" || keyword === "ซื้อ") {
              cleanText = cleanText.substring(keyword.length).trim();
            }
            break;
          }
        }

        matchedCategory = cats?.find(c => c.name.toLowerCase() === cleanText.toLowerCase());
        if (!matchedCategory) {
          const smartMap: { [key: string]: string } = {
            "ข้าว": "อาหารและเครื่องดื่ม", "อาหาร": "อาหารและเครื่องดื่ม", "กิน": "อาหารและเครื่องดื่ม",
            "รถ": "ค่าเดินทาง", "เดินทาง": "ค่าเดินทาง", "เน็ต": "ค่าสาธารณูปโภค", "ค่าไฟ": "ค่าสาธารณูปโภค"
          };
          for (const [key, catName] of Object.entries(smartMap)) {
            if (cleanText.includes(key)) {
              matchedCategory = cats?.find(c => c.name === catName);
              if (matchedCategory) break;
            }
          }
        }
        if (!matchedCategory) {
          matchedCategory = cats?.find(c => c.name.toLowerCase().includes(cleanText.toLowerCase()) || cleanText.toLowerCase().includes(c.name.toLowerCase()));
        }
      }

      if (!matchedCategory) {
        const fallbackName = type === "expense" ? "อื่นๆ" : "รายได้อื่น";
        matchedCategory = cats?.find(c => c.name === fallbackName) || cats?.[0] || null;
      }



      // 1 บัญชี หรือ AI เลือกระบุบัญชีมาให้แม่นยำ — บันทึกทันที ไม่ต้องถาม
      const finalAccount = targetAccount || (accounts.length === 1 ? accounts[0] : null);
      if (finalAccount) {
        const thDate = getThDate();
        const todayStr = thDate.toISOString().split("T")[0];
        const { error: insertError } = await supabase
          .from("transactions")
          .insert([{
            user_id: userId, type, amount, date: todayStr,
            account_id: finalAccount.id,
            category_id: matchedCategory?.id || null,
            note: cleanText !== matchedCategory?.name ? cleanText : null,
            source: "line_bot",
          }]);
        if (insertError) throw insertError;
        await replyMessage(replyToken,
          `✅ บันทึกรายการสำเร็จ!\nประเภท: ${type === "income" ? "รายรับ 🟢" : "รายจ่าย 🔴"}\nยอดเงิน: ฿${amount.toLocaleString()}\nหมวดหมู่: ${matchedCategory?.name || "ไม่มี"}\nบัญชี: ${finalAccount.name}\nโน้ต: ${cleanText}\n\n💡 พิมพ์ "ลบ #1" หากต้องการลบรายการนี้`);
        continue;
      }

      // 2+ บัญชี — บันทึก Pending แล้วถามเลือกบัญชีผ่าน Quick Reply
      const thDateP = getThDate();
      const expiresAt = new Date(thDateP.getTime() + 10 * 60 * 1000).toISOString();
      const { error: pendingInsertError } = await supabase
        .from("line_pending_transactions")
        .upsert({
          line_user_id: lineUserId, user_id: userId, type, amount,
          category_id: matchedCategory?.id || null,
          category_name: matchedCategory?.name || null,
          note: cleanText, expires_at: expiresAt,
        }, { onConflict: "line_user_id" });

      if (pendingInsertError) {
        console.error("LINE BOT: Failed to upsert pending transaction", pendingInsertError.message);
        await replyMessage(replyToken, `เกิดข้อผิดพลาดในการเตรียมรายการ: ${pendingInsertError.message}`);
        continue;
      }

      const quickReplies = accounts.map((acc) => ({
        type: "action",
        action: { type: "message", label: acc.name.substring(0, 20), text: `เลือกบัญชี: ${acc.name}` },
      }));

      await replyMessage(replyToken,
        `❓ เลือกบัญชีสำหรับบันทึกรายการ:\n\nประเภท: ${type === "income" ? "รายรับ 🟢" : "รายจ่าย 🔴"}\nหมวดหมู่: ${matchedCategory?.name || "ไม่มี"}\nจำนวนเงิน: ฿${amount.toLocaleString()}\nโน้ต: ${cleanText}`,
        quickReplies);
    } catch (err: any) {
      console.error("LINE BOT internal processing error:", err);
      await replyMessage(replyToken, `เกิดข้อผิดพลาดภายในระบบ: ${err.message || err}`);
    }
  }

  return new NextResponse("OK", { status: 200 });
}
