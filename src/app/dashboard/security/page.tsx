"use client";

import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import styles from "./security.module.css";

type AuthProvider = {
  id: string;
  provider: string;
  provider_uid: string | null;
  line_user_id: string | null;
  created_at: string | null;
  user_id: string | null;
};

const PROVIDER_ICONS: Record<string, string> = {
  email: "✉️",
  google: "🔵",
  line: "💚",
  facebook: "📘",
  github: "⚫",
};

const PROVIDER_LABELS: Record<string, string> = {
  email: "อีเมล / รหัสผ่าน",
  google: "Google",
  line: "LINE",
  facebook: "Facebook",
  github: "GitHub",
};

function formatDate(dateStr: string | null) {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("th-TH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function maskUid(uid: string | null) {
  if (!uid) return "-";
  if (uid.length <= 8) return uid;
  return uid.substring(0, 4) + "••••" + uid.substring(uid.length - 4);
}

export default function SecurityPage() {
  const supabase = useMemo(() => createClient(), []);

  const [providers, setProviders] = useState<AuthProvider[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      setLoading(true);

      // อ่าน URL params แล้วล้างทันที ป้องกัน state ค้างตอน refresh
      const params = new URLSearchParams(window.location.search);
      const urlErr = params.get("error");
      const urlSuccess = params.get("success");
      if (urlErr || urlSuccess) {
        window.history.replaceState({}, "", window.location.pathname);
      }

      if (urlSuccess === "line_linked") {
        setSuccessMsg("✅ เชื่อมต่อบัญชี LINE เรียบร้อยแล้ว!");
      } else if (urlErr === "line_already_linked") {
        setError("❌ บัญชี LINE นี้ถูกเชื่อมต่อกับผู้ใช้รายอื่นแล้ว");
      } else if (urlErr === "link_failed") {
        setError("❌ บันทึกการเชื่อมต่อล้มเหลว กรุณาลองใหม่");
      } else if (urlErr) {
        setError(`❌ การเชื่อมต่อล้มเหลว: ${urlErr}`);
      }

      const { data: { user }, error: authErr } = await supabase.auth.getUser();
      if (authErr || !user) {
        setError("ไม่พบผู้ใช้ที่เข้าสู่ระบบ");
        setLoading(false);
        return;
      }

      setUserId(user.id);
      setUserEmail(user.email ?? null);

      const { data, error: fetchErr } = await supabase
        .from("auth_providers")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });

      if (fetchErr) {
        setError(fetchErr.message);
      } else {
        setProviders((data ?? []) as AuthProvider[]);
      }
      setLoading(false);
    }
    loadData();
  }, [supabase]);

  function handleLinkLine() {
    const clientId = "2010660050";
    const redirectUri = encodeURIComponent(window.location.origin + "/auth/line/callback");
    const state = "link_account";
    window.location.href = `https://access.line.me/oauth2/v2.1/authorize?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}&state=${state}&scope=profile%20openid%20email`;
  }

  async function handleUnlink(provider: AuthProvider) {
    if (providers.length <= 1) {
      setError("ไม่สามารถยกเลิกการเชื่อมต่อได้ — ต้องมี Provider อย่างน้อย 1 ช่องทาง");
      return;
    }
    if (!confirm(`ยืนยันการยกเลิกการเชื่อมต่อ ${PROVIDER_LABELS[provider.provider] ?? provider.provider}?`)) return;

    setActionLoading(provider.id);
    setError(null);
    setSuccessMsg(null);

    const { error: delErr } = await supabase
      .from("auth_providers")
      .delete()
      .eq("id", provider.id);

    if (delErr) {
      setError(delErr.message);
    } else {
      setProviders((prev) => prev.filter((p) => p.id !== provider.id));
      setSuccessMsg(`ยกเลิกการเชื่อมต่อ ${PROVIDER_LABELS[provider.provider] ?? provider.provider} เรียบร้อยแล้ว`);
    }
    setActionLoading(null);
  }

  async function handleSignOut() {
    if (!confirm("ต้องการออกจากระบบในทุกอุปกรณ์?")) return;
    await supabase.auth.signOut({ scope: "global" });
    window.location.href = "/login";
  }

  return (
    <main className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>ความปลอดภัย</h1>
        <p className={styles.subtitle}>จัดการช่องทางการเข้าสู่ระบบและความปลอดภัยของบัญชี</p>
      </div>

      {error && <div className={styles.errorBox}>{error}</div>}
      {successMsg && <div className={styles.successBox}>{successMsg}</div>}

      {/* Account Info */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>ข้อมูลบัญชี</h2>
        <div className={styles.infoGrid}>
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>User ID</span>
            <span className={styles.mono}>{userId ?? "-"}</span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>อีเมล</span>
            <span>{userEmail ?? "-"}</span>
          </div>
        </div>
      </section>

      {/* Connected Providers */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          ช่องทางการเข้าสู่ระบบที่เชื่อมต่อ
          <span className={styles.count}>{providers.length}</span>
        </h2>

        {loading ? (
          <div className={styles.loadingRow}>
            <div className={styles.spinner} />
            กำลังโหลด...
          </div>
        ) : providers.length === 0 ? (
          <div className={styles.empty}>ไม่พบช่องทางการเข้าสู่ระบบ</div>
        ) : (
          <div className={styles.providerList}>
            {providers.map((p) => (
              <div key={p.id} className={styles.providerCard}>
                <div className={styles.providerIcon}>
                  {PROVIDER_ICONS[p.provider] ?? "🔑"}
                </div>
                <div className={styles.providerInfo}>
                  <div className={styles.providerName}>
                    {PROVIDER_LABELS[p.provider] ?? p.provider}
                  </div>
                  <div className={styles.providerMeta}>
                    {p.provider === "line" && p.line_user_id
                      ? `LINE UID: ${maskUid(p.line_user_id)}`
                      : p.provider_uid
                      ? `UID: ${maskUid(p.provider_uid)}`
                      : null}
                    {p.created_at && (
                      <span>เชื่อมต่อเมื่อ {formatDate(p.created_at)}</span>
                    )}
                  </div>
                </div>
                <div className={styles.providerStatus}>
                  <span className={styles.connectedBadge}>✓ เชื่อมต่อแล้ว</span>
                  {providers.length > 1 && (
                    <button
                      className={styles.unlinkBtn}
                      onClick={() => handleUnlink(p)}
                      disabled={actionLoading === p.id}
                    >
                      {actionLoading === p.id ? "กำลังยกเลิก..." : "ยกเลิกการเชื่อมต่อ"}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && !providers.some(p => p.provider === "line") && (
          <div style={{ marginTop: "1.5rem" }}>
            <button onClick={handleLinkLine} className={styles.linkLineBtn}>
              💚 เชื่อมต่อกับบัญชี LINE
            </button>
          </div>
        )}
      </section>

      {/* Security Actions */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>การดำเนินการ</h2>
        <div className={styles.actionGrid}>
          <div className={styles.actionCard}>
            <div className={styles.actionIcon}>🔐</div>
            <div className={styles.actionContent}>
              <div className={styles.actionTitle}>เปลี่ยนรหัสผ่าน</div>
              <div className={styles.actionDesc}>ไปที่หน้าตั้งค่าเพื่อเปลี่ยนรหัสผ่านของคุณ</div>
            </div>
            <a href="/dashboard/settings" className={styles.actionBtn}>
              ไปที่ตั้งค่า
            </a>
          </div>
          <div className={styles.actionCard}>
            <div className={styles.actionIcon}>🚪</div>
            <div className={styles.actionContent}>
              <div className={styles.actionTitle}>ออกจากระบบทุกอุปกรณ์</div>
              <div className={styles.actionDesc}>ยกเลิก session ทั้งหมดทุกที่ที่เข้าสู่ระบบไว้</div>
            </div>
            <button className={styles.signOutBtn} onClick={handleSignOut}>
              ออกจากระบบ
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
