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
async function getLineImageBuffer(messageId: string): Promise<Buffer | null> {
  const token = process.env.LINE_BOT_CHANNEL_ACCESS_TOKEN;
  if (!token) return null;
  try {
    const res = await fetch(`https://api-data.line.me/v2/bot/message/${messageId}/content`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer);
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

        // 3. Insert real transaction
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

        // 4. Delete pending record
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
          let aiContent: any[] = [];
          
          if (messageType === "image") {
             const imageBuffer = await getLineImageBuffer(event.message.id);
             if (!imageBuffer) throw new Error("Could not download image from LINE");
             
             prompt = prompt + `\n\nPlease extract the transaction details from this receipt or bank slip image.`;
             aiContent = [
               { text: prompt },
               { inlineData: { data: imageBuffer.toString("base64"), mimeType: "image/jpeg" } }
             ];
          } else {
             prompt = prompt + `\n\nParse this user message: "${userMessage}"`;
             aiContent = [{ text: prompt }];
          }

          const response = await ai.models.generateContent({
             model: 'gemini-2.5-flash',
             contents: aiContent
          });
          
          const rawText = (response.text || "").trim();
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
        } catch (aiErr) {
          console.error("LINE BOT AI Parsing Error:", aiErr);
          // Fallback if AI fails
          apiKey = ""; // Trigger fallback
        }
      }

      if (!apiKey || isNaN(amount) || amount <= 0) {
        if (messageType === "image") {
          await replyMessage(replyToken, "ขออภัยครับ การอ่านรูปภาพต้องใช้ AI แต่คุณยังไม่ได้ใส่ API Key หรือ AI อาจมีปัญหาครับ");
          continue;
        }

        // Legacy Pattern Parsing Path (Fallback)
        const cleanInput = userMessage.replace(/,/g, "");
        const amountMatch = cleanInput.match(/(\d+(?:\.\d+)?)/);
        if (!amountMatch) {
          await replyMessage(
            replyToken,
            `💡 คำแนะนำการใช้งานแชทบอท:\n\n1. บันทึกรายจ่าย: พิมพ์ชื่อรายการตามด้วยราคา (เช่น 'ค่าข้าว 150')\n2. บันทึกรายรับ: พิมพ์คำว่า 'รายรับ' นำหน้า\n3. ดูสรุป: พิมพ์ 'สรุป'\n4. ดูประวัติล่าสุด: พิมพ์ 'ล่าสุด'\n5. ลบรายการผิด: พิมพ์ 'ลบ #1'`
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
