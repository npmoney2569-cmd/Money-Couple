"use client";

export default function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        padding: "10px 18px",
        borderRadius: "999px",
        fontWeight: 700,
        fontSize: "0.88rem",
        border: "1px solid rgba(139, 170, 255, 0.3)",
        background: "rgba(139, 170, 255, 0.08)",
        color: "#8ba9ff",
        cursor: "pointer",
        transition: "all 0.15s",
        textDecoration: "none",
      }}
    >
      🖨️ PDF / Print
    </button>
  );
}
