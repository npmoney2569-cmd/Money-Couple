"use client";

import { Wallet, Banknote, CreditCard } from "lucide-react";

export type BankPreset = "kbank" | "scb" | "bbl" | "ktb" | "krungsri" | "ttb" | "gsb" | "cash" | "wallet" | "credit";

export const BANK_PRESETS: Record<string, { label: string, color: string, bg: string, text?: string }> = {
  kbank: { label: "กสิกรไทย (KBank)", color: "#16a34a", bg: "#dcfce7", text: "K" },
  scb: { label: "ไทยพาณิชย์ (SCB)", color: "#9333ea", bg: "#f3e8ff", text: "S" },
  bbl: { label: "กรุงเทพ (BBL)", color: "#2563eb", bg: "#dbeafe", text: "B" },
  ktb: { label: "กรุงไทย (KTB)", color: "#0ea5e9", bg: "#e0f2fe", text: "K" },
  krungsri: { label: "กรุงศรีฯ (Krungsri)", color: "#ca8a04", bg: "#fef08a", text: "K" },
  ttb: { label: "ทีทีบี (TTB)", color: "#ea580c", bg: "#ffedd5", text: "T" },
  gsb: { label: "ออมสิน (GSB)", color: "#db2777", bg: "#fce7f3", text: "G" },
  cash: { label: "เงินสด (Cash)", color: "#059669", bg: "#d1fae5" },
  wallet: { label: "e-Wallet (TrueMoney, etc.)", color: "#4f46e5", bg: "#e0e7ff" },
  credit: { label: "บัตรเครดิต", color: "#e11d48", bg: "#ffe4e6" }
};

interface BankIconProps {
  preset?: string | null;
  url?: string | null;
  size?: number;
}

export function BankIcon({ preset, url, size = 32 }: BankIconProps) {
  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img 
        src={url} 
        alt="account icon" 
        style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} 
      />
    );
  }

  const bank = preset ? BANK_PRESETS[preset] : null;

  if (bank) {
    if (bank.text) {
      return (
        <div style={{
          width: size, height: size, borderRadius: "50%", 
          backgroundColor: bank.bg, color: bank.color,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontWeight: "bold", fontSize: size * 0.55, border: `1px solid ${bank.color}33`,
          flexShrink: 0
        }}>
          {bank.text}
        </div>
      );
    }
    
    // Fallback icons based on preset
    const iconSize = size * 0.55;
    if (preset === "cash") return <div style={{ width: size, height: size, borderRadius: "50%", backgroundColor: bank.bg, display: "flex", alignItems: "center", justifyContent: "center", color: bank.color, flexShrink: 0 }}><Banknote size={iconSize} /></div>;
    if (preset === "credit") return <div style={{ width: size, height: size, borderRadius: "50%", backgroundColor: bank.bg, display: "flex", alignItems: "center", justifyContent: "center", color: bank.color, flexShrink: 0 }}><CreditCard size={iconSize} /></div>;
    return <div style={{ width: size, height: size, borderRadius: "50%", backgroundColor: bank.bg, display: "flex", alignItems: "center", justifyContent: "center", color: bank.color, flexShrink: 0 }}><Wallet size={iconSize} /></div>;
  }

  // Default fallback
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", backgroundColor: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b", flexShrink: 0 }}>
      <Wallet size={size * 0.55} />
    </div>
  );
}
