"use client";

import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";
import styles from "./theme-toggle.module.css";

type Props = {
  variant?: "topbar" | "sidebar";
};

export default function ThemeToggle({ variant = "topbar" }: Props) {
  const [theme, setTheme] = useState<"light" | "dark">("dark");

  useEffect(() => {
    // Read theme from localStorage or document attribute
    const savedTheme = localStorage.getItem("theme") as "light" | "dark" | null;
    const currentTheme = savedTheme || "dark";
    setTheme(currentTheme);
    document.documentElement.setAttribute("data-theme", currentTheme);
  }, []);

  function toggleTheme() {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);

    // Sync to Supabase in background (if logged in, fail silently if not)
    fetch("/api/theme", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ theme: newTheme }),
    }).catch(() => {});
  }

  if (variant === "sidebar") {
    return (
      <div className={styles.sidebarRow} onClick={toggleTheme}>
        <div className={styles.sidebarLabel}>
          <span>{theme === "dark" ? "โหมดมืด" : "โหมดสว่าง"}</span>
        </div>
        <div className={`${styles.switch} ${theme === "dark" ? styles.switchOn : ""}`}>
          <div className={styles.handle}>
            {theme === "dark" ? <Moon size={10} className={styles.switchIcon} /> : <Sun size={10} className={styles.switchIcon} />}
          </div>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      className={styles.topbarBtn}
      onClick={toggleTheme}
      title={theme === "dark" ? "เปลี่ยนเป็นโหมดสว่าง" : "เปลี่ยนเป็นโหมดมืด"}
    >
      {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
