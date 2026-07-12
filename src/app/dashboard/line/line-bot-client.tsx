"use client";

import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";

const LINE_BOT_ID = "@470pqnbe";
const LINE_ADD_URL = `https://line.me/R/ti/p/${LINE_BOT_ID}`;
const LINE_QR_URL = `https://qr-official.line.me/sid/M/470pqnbe.png`;

type AuthProvider = {
  id: string;
  provider: string;
  provider_uid: string | null;
  line_user_id: string | null;
  created_at: string | null;
};

function maskUid(uid: string | null) {
  if (!uid) return "-";
  if (uid.length <= 8) return uid;
  return uid.substring(0, 4) + "••••" + uid.substring(uid.length - 4);
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" });
}

export default function LineBotClient() {
  const supabase = useMemo(() => createClient(), []);
  const [copied, setCopied] = useState(false);
  const [lineProvider, setLineProvider] = useState<AuthProvider | null>(null);
  const [loadingProvider, setLoadingProvider] = useState(true);
  const [linking, setLinking] = useState(false);
  const [unlinking, setUnlinking] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("success") === "line_linked") setMsg({ type: "success", text: "✅ เชื่อมต่อบัญชี LINE เรียบร้อยแล้ว!" });
    if (params.get("error") === "line_already_linked") setMsg({ type: "error", text: "❌ บัญชี LINE นี้ถูกเชื่อมต่อกับผู้ใช้รายอื่นแล้ว" });

    async function loadProvider() {
      setLoadingProvider(true);
      const { data } = await supabase.from("auth_providers").select("*").eq("provider", "line").maybeSingle();
      setLineProvider(data ?? null);
      setLoadingProvider(false);
    }
    loadProvider();
  }, [supabase]);

  function handleLinkLine() {
    setLinking(true);
    const clientId = "2010660050";
    const redirectUri = encodeURIComponent(window.location.origin + "/auth/line/callback");
    const state = "link_account";
    window.location.href = `https://access.line.me/oauth2/v2.1/authorize?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}&state=${state}&scope=profile%20openid%20email`;
  }

  async function handleUnlinkLine() {
    if (!lineProvider) return;
    if (!confirm("ยืนยันการยกเลิกการเชื่อมต่อ LINE?")) return;
    setUnlinking(true);
    const { error } = await supabase.from("auth_providers").delete().eq("id", lineProvider.id);
    if (error) {
      setMsg({ type: "error", text: "❌ " + error.message });
    } else {
      setLineProvider(null);
      setMsg({ type: "success", text: "✅ ยกเลิกการเชื่อมต่อ LINE เรียบร้อยแล้ว" });
    }
    setUnlinking(false);
  }

  function copyId() {
    navigator.clipboard.writeText(LINE_BOT_ID);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div>
      {/* ── Add Friend Banner ── */}
      <div style={{
        background: "linear-gradient(135deg, #06C755 0%, #00a844 60%, #007a32 100%)",
        borderRadius: 20, padding: "32px 36px", marginBottom: 24,
        display: "flex", gap: 36, alignItems: "center", flexWrap: "wrap",
        boxShadow: "0 8px 32px rgba(6,199,85,0.25)", position: "relative", overflow: "hidden",
      }}>
        <div style={{ position: "absolute", right: -40, top: -40, width: 200, height: 200, borderRadius: "50%", background: "rgba(255,255,255,0.07)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", right: 60, bottom: -60, width: 160, height: 160, borderRadius: "50%", background: "rgba(255,255,255,0.05)", pointerEvents: "none" }} />

        {/* QR */}
        <div style={{ background: "#fff", borderRadius: 16, padding: 12, boxShadow: "0 4px 16px rgba(0,0,0,0.18)", flexShrink: 0 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={LINE_QR_URL} alt="QR Code" width={130} height={130} style={{ display: "block", borderRadius: 8 }}
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 220 }}>
          <div style={{ color: "rgba(255,255,255,0.9)", fontSize: 12, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6 }}>LINE Bot</div>
          <h2 style={{ color: "#fff", fontSize: 24, fontWeight: 800, margin: "0 0 4px 0" }}>Money Couple Bot</h2>
          <p style={{ color: "rgba(255,255,255,0.82)", fontSize: 14, margin: "0 0 20px 0", lineHeight: 1.6 }}>
            บันทึกรายรับ-รายจ่ายผ่าน LINE ได้ทันที<br />
            แค่พิมพ์ <strong style={{ color: "#fff" }}>&quot;ค่าข้าว 60&quot;</strong> หรือ <strong style={{ color: "#fff" }}>&quot;รายรับ เงินเดือน 15000&quot;</strong>
          </p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <a href={LINE_ADD_URL} target="_blank" rel="noopener noreferrer"
              style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#fff", color: "#06C755", fontWeight: 700, fontSize: 15, borderRadius: 50, padding: "10px 24px", textDecoration: "none", boxShadow: "0 2px 12px rgba(0,0,0,0.15)" }}>
              💚 เพิ่มเพื่อนใน LINE
            </a>
            <button onClick={copyId}
              style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.2)", color: "#fff", fontWeight: 600, fontSize: 14, borderRadius: 50, padding: "10px 20px", border: "1.5px solid rgba(255,255,255,0.4)", cursor: "pointer" }}>
              {copied ? "✓ คัดลอกแล้ว!" : `คัดลอก ID: ${LINE_BOT_ID}`}
            </button>
          </div>
        </div>

        {/* Usage */}
        <div style={{ background: "rgba(255,255,255,0.13)", borderRadius: 14, padding: "16px 20px", minWidth: 200, flexShrink: 0 }}>
          <p style={{ color: "#fff", fontWeight: 700, fontSize: 13, margin: "0 0 10px 0" }}>📝 วิธีใช้งาน</p>
          {[
            { cmd: "ค่าข้าว 60", desc: "บันทึกรายจ่าย" },
            { cmd: "รับเงิน 500", desc: "บันทึกรายรับ" },
            { cmd: "ยอด", desc: "ดูยอดเงินคงเหลือ" },
            { cmd: "สรุป", desc: "สรุปรายการเดือนนี้" },
          ].map(({ cmd, desc }) => (
            <div key={cmd} style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 6 }}>
              <code style={{ background: "rgba(0,0,0,0.2)", color: "#fff", borderRadius: 6, padding: "2px 8px", fontSize: 12 }}>{cmd}</code>
              <span style={{ color: "rgba(255,255,255,0.8)", fontSize: 12 }}>{desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── LINE Account Linking ── */}
      <div style={{
        background: "var(--card-bg, #1a1f35)", borderRadius: 16, padding: "24px 28px", marginBottom: 24,
        border: "1px solid rgba(255,255,255,0.08)",
      }}>
        <h3 style={{ margin: "0 0 6px 0", fontSize: 17, fontWeight: 700, color: "var(--text-primary, #fff)" }}>
          💚 เชื่อมต่อบัญชี LINE ของคุณ
        </h3>
        <p style={{ margin: "0 0 20px 0", fontSize: 13, color: "var(--text-muted, #8a8fa8)" }}>
          เชื่อมต่อ LINE เพื่อบันทึกรายการผ่านบอทและรับการแจ้งเตือน
        </p>

        {msg && (
          <div style={{
            background: msg.type === "success" ? "rgba(46,227,168,0.12)" : "rgba(255,101,128,0.12)",
            border: `1px solid ${msg.type === "success" ? "#2ee3a8" : "#ff6580"}`,
            color: msg.type === "success" ? "#2ee3a8" : "#ff6580",
            borderRadius: 10, padding: "10px 16px", marginBottom: 16, fontSize: 14,
          }}>
            {msg.text}
          </div>
        )}

        {loadingProvider ? (
          <div style={{ color: "var(--text-muted, #8a8fa8)", fontSize: 14 }}>กำลังโหลด...</div>
        ) : lineProvider ? (
          <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1 }}>
              <div style={{ width: 44, height: 44, borderRadius: "50%", background: "rgba(6,199,85,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>💚</div>
              <div>
                <div style={{ fontWeight: 700, color: "var(--text-primary, #fff)", fontSize: 15 }}>LINE</div>
                <div style={{ fontSize: 12, color: "var(--text-muted, #8a8fa8)" }}>
                  UID: {maskUid(lineProvider.line_user_id)} · เชื่อมต่อเมื่อ {formatDate(lineProvider.created_at)}
                </div>
              </div>
            </div>
            <span style={{ background: "rgba(46,227,168,0.15)", color: "#2ee3a8", borderRadius: 20, padding: "4px 14px", fontSize: 13, fontWeight: 600 }}>✓ เชื่อมต่อแล้ว</span>
            <button onClick={handleUnlinkLine} disabled={unlinking}
              style={{ background: "rgba(255,101,128,0.12)", color: "#ff6580", border: "1px solid rgba(255,101,128,0.3)", borderRadius: 8, padding: "8px 16px", fontSize: 13, cursor: "pointer", fontWeight: 600 }}>
              {unlinking ? "กำลังยกเลิก..." : "ยกเลิกการเชื่อมต่อ"}
            </button>
          </div>
        ) : (
          <button onClick={handleLinkLine} disabled={linking}
            style={{ display: "inline-flex", alignItems: "center", gap: 10, background: "#06C755", color: "#fff", fontWeight: 700, fontSize: 15, borderRadius: 12, padding: "12px 28px", border: "none", cursor: "pointer", boxShadow: "0 4px 16px rgba(6,199,85,0.3)" }}>
            💚 {linking ? "กำลังเชื่อมต่อ..." : "เชื่อมต่อกับบัญชี LINE"}
          </button>
        )}
      </div>
    </div>
  );
}
