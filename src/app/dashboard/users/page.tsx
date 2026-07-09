"use client";

import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import styles from "./users.module.css";

type UserProfile = {
  id: string;
  display_name: string | null;
  email: string | null;
  avatar_url: string | null;
  created_at: string | null;
  updated_at: string | null;
};

function formatDate(dateStr: string | null) {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("th-TH", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getInitials(name: string | null, email: string | null) {
  const str = name || email || "?";
  return str.substring(0, 2).toUpperCase();
}

export default function UsersPage() {
  const supabase = useMemo(() => createClient(), []);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    async function loadProfile() {
      setLoading(true);
      // Get current authenticated user
      const { data: { user }, error: authErr } = await supabase.auth.getUser();
      if (authErr || !user) {
        setError("ไม่พบข้อมูลผู้ใช้ กรุณาเข้าสู่ระบบใหม่");
        setLoading(false);
        return;
      }

      // Fetch from users table using authenticated user ID
      const { data, error: fetchErr } = await supabase
        .from("users")
        .select("id, display_name, email, avatar_url, created_at, updated_at")
        .eq("id", user.id)
        .single();

      if (fetchErr) {
        // Fallback to auth user metadata if users table row not found
        setProfile({
          id: user.id,
          display_name: user.user_metadata?.display_name ?? user.user_metadata?.name ?? null,
          email: user.email ?? null,
          avatar_url: user.user_metadata?.avatar_url ?? null,
          created_at: user.created_at ?? null,
          updated_at: null,
        });
      } else {
        setProfile(data as UserProfile);
        setDisplayName(data.display_name ?? "");
      }
      setLoading(false);
    }
    loadProfile();
  }, [supabase]);

  async function handleSave() {
    if (!profile) return;
    setSaving(true);
    setError(null);
    setSuccessMsg(null);

    const { error: updateErr } = await supabase
      .from("users")
      .update({ display_name: displayName, updated_at: new Date().toISOString() })
      .eq("id", profile.id);

    if (updateErr) {
      setError(updateErr.message);
    } else {
      setProfile((prev) => prev ? { ...prev, display_name: displayName } : prev);
      setSuccessMsg("อัปเดตข้อมูลเรียบร้อยแล้ว");
      setEditing(false);
    }
    setSaving(false);
  }

  if (loading) {
    return (
      <main className={styles.page}>
        <div className={styles.loadingWrap}>
          <div className={styles.spinner} />
          <span>กำลังโหลดข้อมูล...</span>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>โปรไฟล์ของฉัน</h1>
        <p className={styles.subtitle}>ข้อมูลส่วนตัวของคุณ — แสดงเฉพาะข้อมูลบัญชีตัวเอง</p>
      </div>

      {error && <div className={styles.errorBox}>{error}</div>}
      {successMsg && <div className={styles.successBox}>{successMsg}</div>}

      {profile && (
        <div className={styles.profileCard}>
          {/* Avatar */}
          <div className={styles.avatarSection}>
            {profile.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.avatar_url}
                alt="avatar"
                className={styles.avatar}
              />
            ) : (
              <div className={styles.avatarPlaceholder}>
                {getInitials(profile.display_name, profile.email)}
              </div>
            )}
            <div className={styles.avatarInfo}>
              <div className={styles.nameDisplay}>
                {profile.display_name || "ยังไม่ได้ตั้งชื่อ"}
              </div>
              <div className={styles.emailDisplay}>{profile.email || "-"}</div>
            </div>
          </div>

          <hr className={styles.divider} />

          {/* Info grid */}
          <div className={styles.infoGrid}>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>User ID</span>
              <span className={styles.infoValue + " " + styles.mono}>
                {profile.id}
              </span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>อีเมล</span>
              <span className={styles.infoValue}>{profile.email || "-"}</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>สมัครเมื่อ</span>
              <span className={styles.infoValue}>{formatDate(profile.created_at)}</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>อัปเดตล่าสุด</span>
              <span className={styles.infoValue}>{formatDate(profile.updated_at)}</span>
            </div>
          </div>

          <hr className={styles.divider} />

          {/* Edit display name */}
          <div className={styles.editSection}>
            <div className={styles.editLabel}>ชื่อที่แสดง</div>
            {editing ? (
              <div className={styles.editRow}>
                <input
                  className={styles.input}
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="ใส่ชื่อที่ต้องการแสดง"
                  autoFocus
                />
                <button
                  className={styles.saveBtn}
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? "กำลังบันทึก..." : "บันทึก"}
                </button>
                <button
                  className={styles.cancelBtn}
                  onClick={() => {
                    setEditing(false);
                    setDisplayName(profile.display_name ?? "");
                  }}
                  disabled={saving}
                >
                  ยกเลิก
                </button>
              </div>
            ) : (
              <div className={styles.editRow}>
                <span className={styles.editValue}>
                  {profile.display_name || <span className={styles.empty}>ยังไม่ได้ตั้งชื่อ</span>}
                </span>
                <button
                  className={styles.editBtn}
                  onClick={() => {
                    setDisplayName(profile.display_name ?? "");
                    setEditing(true);
                    setSuccessMsg(null);
                  }}
                >
                  ✏️ แก้ไข
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
