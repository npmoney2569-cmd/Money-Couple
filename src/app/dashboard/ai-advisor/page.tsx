"use client";

import { useState } from "react";
import styles from "./ai-advisor.module.css";
import { Sparkles, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";

export default function AiAdvisorPage() {
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generateReport = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai-advisor", { method: "POST" });
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "เกิดข้อผิดพลาดในการสร้างรายงาน");
      }
      
      setReport(data.markdown);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>AI ผู้ช่วยการเงินส่วนตัว</h1>
        <p className={styles.subtitle}>
          ให้ AI อัจฉริยะวิเคราะห์พฤติกรรมการใช้จ่ายของคุณในเดือนนี้ และให้คำแนะนำแบบเจาะลึก
        </p>
      </header>

      <div className={styles.actionArea}>
        <button 
          className={styles.analyzeBtn} 
          onClick={generateReport}
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 className={styles.loadingSpinner} />
              AI กำลังประมวลผลข้อมูล...
            </>
          ) : (
            <>
              <Sparkles />
              {report ? "วิเคราะห์ใหม่อีกครั้ง" : "เริ่มวิเคราะห์สถานะการเงิน"}
            </>
          )}
        </button>
      </div>

      {error && (
        <div style={{ color: "red", textAlign: "center", marginBottom: "2rem" }}>
          ❌ {error}
        </div>
      )}

      {report && (
        <article className={styles.resultCard}>
          <div className={styles.markdownContainer}>
            <ReactMarkdown>{report}</ReactMarkdown>
          </div>
        </article>
      )}
    </main>
  );
}
