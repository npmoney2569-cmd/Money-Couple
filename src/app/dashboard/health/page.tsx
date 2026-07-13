"use client";

import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import styles from "./health.module.css";
import { Award, Flame, Star, Activity, Trophy } from "lucide-react";

type GamificationStats = {
  current_streak: number;
  longest_streak: number;
  health_score: number;
  points: number;
};

type Badge = {
  id: string;
  name: string;
  description: string;
  icon: string;
  earned_at: string | null;
};

export default function HealthScorePage() {
  const supabase = useMemo(() => createClient(), []);
  
  const [stats, setStats] = useState<GamificationStats | null>(null);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Ensure stats exist
      let { data: statData } = await supabase
        .from("gamification_stats")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!statData) {
        // Fallback if trigger hasn't fired yet
        statData = { current_streak: 0, longest_streak: 0, health_score: 50, points: 0 };
      }

      setStats(statData as GamificationStats);

      // Load all badges and user badges
      const [ { data: allBadges }, { data: userBadges } ] = await Promise.all([
        supabase.from("badges").select("*").order("created_at", { ascending: true }),
        supabase.from("user_badges").select("badge_id, earned_at").eq("user_id", user.id)
      ]);

      if (allBadges) {
        const earnedMap = new Map();
        (userBadges || []).forEach(ub => {
          earnedMap.set(ub.badge_id, ub.earned_at);
        });

        const mergedBadges: Badge[] = allBadges.map(b => ({
          id: b.id,
          name: b.name,
          description: b.description,
          icon: b.icon,
          earned_at: earnedMap.get(b.id) || null
        }));

        setBadges(mergedBadges);
      }
      setLoading(false);
    }

    loadData();
  }, [supabase]);

  if (loading) {
    return <div className={styles.container}>กำลังโหลดข้อมูลสุขภาพการเงิน...</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerIcon}>
          <Award size={32} />
        </div>
        <div>
          <h1 className={styles.title}>สุขภาพการเงิน (Financial Health)</h1>
          <p className={styles.subtitle}>ติดตามพฤติกรรมทางการเงิน สะสมแต้ม และรับเหรียญรางวัล!</p>
        </div>
      </div>

      <div className={styles.statsGrid}>
        <div className={`${styles.statCard} ${styles.score}`}>
          <div className={styles.statLabel}>
            <Activity size={18} color="var(--primary-color)" /> Score
          </div>
          <div className={styles.statValue}>{stats?.health_score || 0}</div>
        </div>

        <div className={`${styles.statCard} ${styles.streak}`}>
          <div className={styles.statLabel}>
            <Flame size={18} color="#f97316" /> Current Streak
          </div>
          <div className={styles.statValue}>{stats?.current_streak || 0} วัน</div>
        </div>

        <div className={`${styles.statCard} ${styles.longest}`}>
          <div className={styles.statLabel}>
            <Trophy size={18} color="#eab308" /> Longest Streak
          </div>
          <div className={styles.statValue}>{stats?.longest_streak || 0} วัน</div>
        </div>

        <div className={`${styles.statCard} ${styles.points}`}>
          <div className={styles.statLabel}>
            <Star size={18} color="#8b5cf6" /> Total Points
          </div>
          <div className={styles.statValue}>{stats?.points || 0}</div>
        </div>
      </div>

      <h2 className={styles.sectionTitle}>เหรียญรางวัล (Badges)</h2>
      <div className={styles.badgesGrid}>
        {badges.map(badge => {
          const isEarned = badge.earned_at !== null;
          return (
            <div key={badge.id} className={`${styles.badgeCard} ${isEarned ? styles.earned : ''}`}>
              <div className={styles.badgeIcon}>{badge.icon}</div>
              <div className={styles.badgeName}>{badge.name}</div>
              <div className={styles.badgeDesc}>{badge.description}</div>
              {isEarned && (
                <div className={styles.badgeDate}>
                  ได้รับเมื่อ: {new Date(badge.earned_at!).toLocaleDateString('th-TH')}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
