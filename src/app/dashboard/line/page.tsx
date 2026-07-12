"use client";

import { useState } from "react";
import DashboardModulePage from "@/components/dashboard-module-page";

const LINE_BOT_ID = "@470pqnbe";
const LINE_ADD_URL = `https://line.me/R/ti/p/${LINE_BOT_ID}`;
const LINE_QR_URL = `https://qr-official.line.me/sid/M/470pqnbe.png`;

export default function LineBotPage() {
  const [copied, setCopied] = useState(false);

  function copyId() {
    navigator.clipboard.writeText(LINE_BOT_ID);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div>
      {/* LINE Bot Add Friend Banner */}
      <div style={{
        background: "linear-gradient(135deg, #06C755 0%, #00a844 60%, #007a32 100%)",
        borderRadius: 20,
        padding: "32px 36px",
        margin: "0 0 28px 0",
        display: "flex",
        gap: 36,
        alignItems: "center",
        flexWrap: "wrap",
        boxShadow: "0 8px 32px rgba(6,199,85,0.25)",
        position: "relative",
        overflow: "hidden",
      }}>
        {/* Decorative circle */}
        <div style={{
          position: "absolute", right: -40, top: -40,
          width: 200, height: 200,
          borderRadius: "50%",
          background: "rgba(255,255,255,0.07)",
          pointerEvents: "none",
        }} />
        <div style={{
          position: "absolute", right: 60, bottom: -60,
          width: 160, height: 160,
          borderRadius: "50%",
          background: "rgba(255,255,255,0.05)",
          pointerEvents: "none",
        }} />

        {/* QR Code */}
        <div style={{
          background: "#fff",
          borderRadius: 16,
          padding: 12,
          boxShadow: "0 4px 16px rgba(0,0,0,0.18)",
          flexShrink: 0,
        }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={LINE_QR_URL}
            alt="QR Code แอด LINE Bot"
            width={130}
            height={130}
            style={{ display: "block", borderRadius: 8 }}
            onError={(e) => {
              // Fallback: hide if QR load fails
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 220 }}>
          {/* LINE logo text */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
              <rect width="32" height="32" rx="8" fill="white" fillOpacity="0.2"/>
              <text x="16" y="22" textAnchor="middle" fontSize="18" fontWeight="bold" fill="white">L</text>
            </svg>
            <span style={{ color: "rgba(255,255,255,0.9)", fontSize: 13, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" }}>
              LINE Bot
            </span>
          </div>

          <h2 style={{ color: "#fff", fontSize: 24, fontWeight: 800, margin: "0 0 4px 0", lineHeight: 1.2 }}>
            Money Couple Bot
          </h2>
          <p style={{ color: "rgba(255,255,255,0.82)", fontSize: 14, margin: "0 0 20px 0", lineHeight: 1.6 }}>
            บันทึกรายรับ-รายจ่ายผ่าน LINE ได้ทันที<br />
            แค่พิมพ์ <strong style={{ color: "#fff" }}>"ค่าข้าว 60"</strong> หรือ <strong style={{ color: "#fff" }}>"รายรับ เงินเดือน 15000"</strong>
          </p>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
            {/* Add friend button */}
            <a
              href={LINE_ADD_URL}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                background: "#fff",
                color: "#06C755",
                fontWeight: 700,
                fontSize: 15,
                borderRadius: 50,
                padding: "10px 24px",
                textDecoration: "none",
                boxShadow: "0 2px 12px rgba(0,0,0,0.15)",
                transition: "transform 0.15s, box-shadow 0.15s",
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(-2px)";
                (e.currentTarget as HTMLAnchorElement).style.boxShadow = "0 6px 20px rgba(0,0,0,0.2)";
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(0)";
                (e.currentTarget as HTMLAnchorElement).style.boxShadow = "0 2px 12px rgba(0,0,0,0.15)";
              }}
            >
              <svg width="18" height="18" viewBox="0 0 32 32" fill="none">
                <path d="M16 3C8.82 3 3 8.14 3 14.4c0 4.1 2.36 7.7 5.92 9.9L7.5 29l5.3-2.82c1.04.28 2.14.42 3.2.42 7.18 0 13-5.14 13-11.4S23.18 3 16 3z" fill="#06C755"/>
              </svg>
              เพิ่มเพื่อนใน LINE
            </a>

            {/* Copy ID button */}
            <button
              onClick={copyId}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                background: "rgba(255,255,255,0.2)",
                color: "#fff",
                fontWeight: 600,
                fontSize: 14,
                borderRadius: 50,
                padding: "10px 20px",
                border: "1.5px solid rgba(255,255,255,0.4)",
                cursor: "pointer",
                transition: "background 0.15s",
              }}
            >
              {copied ? "✓ คัดลอกแล้ว!" : `คัดลอก ID: ${LINE_BOT_ID}`}
            </button>
          </div>
        </div>

        {/* Usage guide */}
        <div style={{
          background: "rgba(255,255,255,0.13)",
          borderRadius: 14,
          padding: "16px 20px",
          minWidth: 200,
          flexShrink: 0,
        }}>
          <p style={{ color: "#fff", fontWeight: 700, fontSize: 13, margin: "0 0 10px 0", letterSpacing: "0.04em" }}>
            📝 วิธีใช้งาน
          </p>
          {[
            { cmd: "ค่าข้าว 60", desc: "บันทึกรายจ่าย" },
            { cmd: "รับเงิน 500", desc: "บันทึกรายรับ" },
            { cmd: "ยอด", desc: "ดูยอดเงินคงเหลือ" },
            { cmd: "สรุป", desc: "สรุปรายการเดือนนี้" },
          ].map(({ cmd, desc }) => (
            <div key={cmd} style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 6 }}>
              <code style={{ background: "rgba(0,0,0,0.2)", color: "#fff", borderRadius: 6, padding: "2px 8px", fontSize: 12, fontFamily: "monospace" }}>
                {cmd}
              </code>
              <span style={{ color: "rgba(255,255,255,0.8)", fontSize: 12 }}>{desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Transaction list */}
      <DashboardModulePage
        title="รายการจาก LINE Bot"
        subtitle="รายการที่บันทึกผ่าน LINE Bot"
        table="transactions"
        filter={{ field: "source", value: "line_bot" }}
        columns={[
          { key: "date", label: "วันที่" },
          { key: "type", label: "ประเภท" },
          { key: "amount", label: "จำนวนเงิน" },
          { key: "merchant", label: "ร้านค้า/ผู้รับ" },
          { key: "note", label: "โน้ต" },
        ]}
      />
    </div>
  );
}
