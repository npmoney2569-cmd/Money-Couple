import styles from "./dashboard-module-page.module.css";
import { createClient } from "@/lib/supabase/server";

type ColumnDef = {
  key: string;
  label: string;
};

type ModuleFilter = {
  field: string;
  value: string | number | boolean;
};

type DashboardModulePageProps = {
  title: string;
  subtitle: string;
  table: string;
  columns: ColumnDef[];
  selectClause?: string;
  orderBy?: string;
  limit?: number;
  filter?: ModuleFilter;
};

function renderValue(value: unknown) {
  if (value === null || value === undefined) return "-";
  if (typeof value === "number") {
    if (Math.abs(value) >= 1000) {
      return new Intl.NumberFormat("th-TH").format(value);
    }
    return String(value);
  }
  if (typeof value === "string") return value;
  if (typeof value === "boolean") return value ? "true" : "false";
  return JSON.stringify(value);
}

export default async function DashboardModulePage({
  title,
  subtitle,
  table,
  columns,
  selectClause,
  orderBy = "created_at",
  limit = 25,
  filter,
}: DashboardModulePageProps) {
  const supabase = await createClient();

  let query = supabase.from(table as any).select(selectClause ?? "*").limit(limit);
  if (filter) {
    query = query.eq(filter.field, filter.value);
  }
  if (orderBy) {
    query = query.order(orderBy, { ascending: false });
  }

  const result = (await query) as {
    data: Array<Record<string, unknown>> | null;
    error: { message: string } | null;
  };
  const rows = Array.isArray(result.data) ? result.data : [];
  const error = result.error;

  return (
    <main className={styles.wrap}>
      <section className={styles.card}>
        <h2 className={styles.title}>{title}</h2>
        <p className={styles.sub}>{subtitle}</p>
      </section>

      <section className={styles.card}>
        {error ? (
          <p className={styles.error}>โหลดตาราง {table} ไม่สำเร็จ: {error.message}</p>
        ) : null}
        <p className={styles.muted}>แสดง {rows.length} รายการล่าสุดจากตาราง {table}</p>

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                {columns.map((col) => (
                  <th key={col.key}>{col.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className={styles.muted}>
                    ไม่พบข้อมูล
                  </td>
                </tr>
              ) : (
                rows.map((row, idx) => (
                  <tr key={String(row.id ?? idx)}>
                    {columns.map((col) => (
                      <td key={`${String(row.id ?? idx)}-${col.key}`}>{renderValue(row[col.key])}</td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
