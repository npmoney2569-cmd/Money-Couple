"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import ChangePasswordForm from "@/components/change-password-form";
import styles from "./settings.module.css";

type UserProfile = {
  id: string;
  display_name: string;
  email: string;
  locale: string;
  currency: string;
  theme: string;
  date_format: string;
  avatar_url: string | null;
};

function initialProfile(id: string, email: string, displayName: string, avatarUrl: string | null): UserProfile {
  return {
    id,
    email,
    display_name: displayName,
    locale: "th",
    currency: "THB",
    theme: "system",
    date_format: "DD/MM/YYYY",
    avatar_url: avatarUrl,
  };
}

export default function SettingsPage() {
  const supabase = useMemo(() => createClient(), []);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    async function loadProfile() {
      setLoading(true);
      setStatus(null);

      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData?.user?.id) {
        setStatus("ไม่สามารถโหลดข้อมูลผู้ใช้ได้");
        setLoading(false);
        return;
      }

      const userId = authData.user.id;
      const { data, error } = await supabase
        .from("users")
        .select("id,display_name,email,locale,currency,theme,date_format,avatar_url")
        .eq("id", userId)
        .maybeSingle();

      if (error) {
        setStatus(`โหลดข้อมูลไม่สำเร็จ: ${error.message}`);
        setLoading(false);
        return;
      }

      if (data) {
        setProfile(data as UserProfile);
      } else {
        setProfile(
          initialProfile(
            userId,
            authData.user.email ?? "",
            (authData.user.user_metadata as any)?.full_name ?? "",
            (authData.user.user_metadata as any)?.avatar_url ?? null
          )
        );
      }

      setLoading(false);
    }

    loadProfile();
  }, [supabase]);

  function updateField(key: keyof UserProfile, value: string) {
    setProfile((current) => (current ? { ...current, [key]: value } : current));
  }

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!profile) return;

    setLoading(true);
    setStatus(null);

    const { error } = await supabase.from("users").upsert(profile);
    setLoading(false);

    if (error) {
      setStatus(`บันทึกไม่สำเร็จ: ${error.message}`);
      return;
    }

    setStatus("บันทึกเรียบร้อยแล้ว");
  }

  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <div className={styles.header}>
          <div>
            <h1>ตั้งค่าโปรไฟล์</h1>
            <p>แก้ไขชื่อที่แสดง, ภาษา, สกุลเงิน และการแสดงผลวันที่</p>
          </div>
          <span className={styles.status}>{status || (loading ? "กำลังโหลด..." : "พร้อมใช้งาน")}</span>
        </div>

        {profile ? (
          <div className={styles.profileColumns}>
            <form className={styles.form} onSubmit={handleSave}>
              <label className={styles.field}>
                <span>อีเมล</span>
                <input className={styles.input} type="email" value={profile.email} readOnly />
              </label>

              <label className={styles.field}>
                <span>ชื่อที่แสดง</span>
                <input
                  className={styles.input}
                  type="text"
                  value={profile.display_name}
                  onChange={(event) => updateField("display_name", event.target.value)}
                  required
                />
              </label>

              <label className={styles.field}>
                <span>ภาษา</span>
                <select
                  className={styles.select}
                  value={profile.locale}
                  onChange={(event) => updateField("locale", event.target.value)}
                >
                  <option value="th">ไทย</option>
                  <option value="en">English</option>
                </select>
              </label>

              <label className={styles.field}>
                <span>สกุลเงิน</span>
                <input
                  className={styles.input}
                  type="text"
                  value={profile.currency}
                  onChange={(event) => updateField("currency", event.target.value)}
                  placeholder="THB"
                />
              </label>

              <label className={styles.field}>
                <span>รูปแบบวันที่</span>
                <input
                  className={styles.input}
                  type="text"
                  value={profile.date_format}
                  onChange={(event) => updateField("date_format", event.target.value)}
                  placeholder="DD/MM/YYYY"
                />
              </label>

              <label className={styles.field}>
                <span>ธีม</span>
                <select
                  className={styles.select}
                  value={profile.theme}
                  onChange={(event) => updateField("theme", event.target.value)}
                >
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                  <option value="system">System</option>
                </select>
              </label>

              <div className={styles.actions}>
                <button type="submit" className={styles.button} disabled={loading}>
                  บันทึกการตั้งค่า
                </button>
              </div>
            </form>

            <div className={styles.extraPanel}>
              <ChangePasswordForm />
            </div>
          </div>
        ) : (
          <p className={styles.error}>ไม่พบข้อมูลผู้ใช้ กรุณาลองใหม่อีกครั้ง</p>
        )}
      </section>
    </main>
  );
}
