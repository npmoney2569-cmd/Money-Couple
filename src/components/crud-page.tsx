"use client";

import { ReactNode, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import styles from "./form-card.module.css";

export type FieldType = "text" | "number" | "textarea" | "select" | "multiselect" | "checkbox" | "date";

export type FieldDef = {
  key: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  required?: boolean;
  options?: { label: string; value: string | number | boolean }[];
  optionsQuery?: {
    table: string;
    labelKey: string;
    valueKey: string;
    filter?: Record<string, string | number | boolean>;
    orderBy?: string;
    orderAscending?: boolean;
  };
};

type ColumnDef = {
  key: string;
  label: string;
  render?: (value: unknown) => ReactNode;
};

type CrudPageProps = {
  title: string;
  subtitle: string;
  table: string;
  columns: ColumnDef[];
  fields: FieldDef[];
  filter?: { field: string; value: string | number | boolean };
  orderBy?: string;
  orderAscending?: boolean;
};

function defaultRender(value: unknown) {
  if (value === null || value === undefined) return "-";
  if (typeof value === "boolean") return value ? "ใช่" : "ไม่ใช่";
  if (typeof value === "number") return String(value);
  return String(value);
}

function initialFieldValue(field: FieldDef) {
  if (field.type === "checkbox") return false;
  if (field.type === "multiselect") return [];
  return "";
}

export default function CrudPage({
  title,
  subtitle,
  table,
  columns,
  fields,
  filter,
  orderBy = "created_at",
  orderAscending = false,
}: CrudPageProps) {
  const supabase = useMemo(() => createClient(), []);
  const hasTagField = table === "transactions" && fields.some((field) => field.key === "tag_ids" && field.type === "multiselect");
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  const [form, setForm] = useState<Record<string, unknown>>(
    fields.reduce((acc, field) => {
      acc[field.key] = initialFieldValue(field);
      return acc;
    }, {} as Record<string, unknown>)
  );
  const [fieldOptions, setFieldOptions] = useState<Record<string, { label: string; value: string | number | boolean }[]>>({});
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [editingId, setEditingId] = useState<unknown>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Merge static field.options + dynamically-loaded fieldOptions for cell rendering
  const allOptions = useMemo(() => {
    const result: Record<string, { label: string; value: string | number | boolean }[]> = { ...fieldOptions };
    fields.forEach((field) => {
      if (field.options && field.options.length > 0 && !result[field.key]) {
        result[field.key] = field.options;
      }
    });
    return result;
  }, [fields, fieldOptions]);

  useEffect(() => {
    async function loadFieldOptions() {
      const queryFields = fields.filter((field) => field.optionsQuery);
      if (queryFields.length === 0) {
        return;
      }

      setOptionsLoading(true);
      try {
        const resolved = await Promise.all(
          queryFields.map(async (field) => {
            const queryDef = field.optionsQuery!;
            let query = supabase.from(queryDef.table as any).select(
              `${queryDef.valueKey},${queryDef.labelKey}`
            );

            if (queryDef.filter) {
              Object.entries(queryDef.filter).forEach(([key, value]) => {
                query = query.eq(key, value as any);
              });
            }

            if (queryDef.orderBy) {
              query = query.order(queryDef.orderBy, { ascending: Boolean(queryDef.orderAscending) });
            }

            const { data, error } = await query.limit(200);
            if (error) {
              throw new Error(`โหลด options สำหรับ ${field.key} ไม่สำเร็จ: ${error.message}`);
            }

            return {
              key: field.key,
              options: Array.isArray(data)
                ? data.map((row) => ({
                    label: String((row as any)[queryDef.labelKey] ?? ""),
                    value: (row as any)[queryDef.valueKey] ?? "",
                  }))
                : [],
            };
          })
        );

        const optionMap = resolved.reduce(
          (acc, item) => ({ ...acc, [item.key]: item.options }),
          {} as Record<string, { label: string; value: string | number | boolean }[]>
        );
        setFieldOptions(optionMap);
      } catch (error) {
        setStatus(error instanceof Error ? error.message : "โหลด options ไม่สำเร็จ");
      } finally {
        setOptionsLoading(false);
      }
    }

    loadFieldOptions();
  }, [fields, supabase]);

  function resetForm() {
    setForm(
      fields.reduce((acc, field) => {
        acc[field.key] = initialFieldValue(field);
        return acc;
      }, {} as Record<string, unknown>)
    );
    setEditingId(null);
    setIsEditing(false);
  }

  async function loadData() {
    setLoading(true);
    let query = supabase.from(table as any).select("*");
    if (filter) {
      query = query.eq(filter.field, filter.value);
    }
    if (orderBy) {
      query = query.order(orderBy, { ascending: orderAscending });
    }
    const { data, error } = await query.limit(200);
    setLoading(false);
    if (error) {
      setStatus(`โหลดข้อมูล ${table} ไม่สำเร็จ: ${error.message}`);
      setRows([]);
      return;
    }

    if (hasTagField) {
      const baseRows = (data ?? []) as Array<Record<string, unknown>>;
      const ids = baseRows
        .map((row) => String(row.id ?? ""))
        .filter((id) => id.length > 0);

      if (ids.length > 0) {
        const { data: tagRows, error: tagError } = await supabase
          .from("transaction_tags")
          .select("transaction_id,tag_id")
          .in("transaction_id", ids);

        if (!tagError) {
          const tagMap = new Map<string, Array<{ tag_id: string | null }>>();
          ((tagRows ?? []) as Array<{ transaction_id: string; tag_id: string | null }>).forEach((row) => {
            const current = tagMap.get(row.transaction_id) ?? [];
            current.push({ tag_id: row.tag_id });
            tagMap.set(row.transaction_id, current);
          });

          const mergedRows = baseRows.map((row) => ({
            ...row,
            transaction_tags: tagMap.get(String(row.id ?? "")) ?? [],
          }));
          setStatus(null);
          setRows(mergedRows);
          return;
        }
      }
    }

    setStatus(null);
    setRows((data ?? []) as Array<Record<string, unknown>>);
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, orderBy, orderAscending, table]);

  function updateFormValue(key: string, value: unknown) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function syncTransactionTags(transactionId: string) {
    const tagIds = (form.tag_ids as string[] | undefined) ?? [];
    const { error: deleteError } = await supabase.from("transaction_tags").delete().eq("transaction_id", transactionId);
    if (deleteError) {
      throw new Error(`อัปเดตแท็กไม่สำเร็จ: ${deleteError.message}`);
    }

    if (tagIds.length === 0) {
      return;
    }

    const payload = tagIds.map((tagId) => ({ transaction_id: transactionId, tag_id: tagId }));
    const { error: insertError } = await supabase.from("transaction_tags").insert(payload as any);
    if (insertError) {
      throw new Error(`บันทึกแท็กไม่สำเร็จ: ${insertError.message}`);
    }
  }

  async function handleCreate() {
    setLoading(true);
    const payload = fields.reduce((acc, field) => {
      const value = form[field.key];
      if (field.type === "multiselect") {
        return acc;
      }
      if (field.type === "number") {
        acc[field.key] = value === "" || value === null ? null : Number(value);
      } else if (field.type === "select") {
        acc[field.key] = value === "" ? null : value;
      } else {
        acc[field.key] = value;
      }
      return acc;
    }, {} as Record<string, unknown>);

    const result = isEditing && editingId !== null
      ? await supabase.from(table as any).update(payload).eq("id", editingId).select("id").single()
      : await supabase.from(table as any).insert([payload]).select("id").single();

    if (result.error) {
      setLoading(false);
      setStatus(`ไม่สามารถ${isEditing ? "อัปเดต" : "สร้าง"}ข้อมูลได้: ${result.error.message}`);
      return;
    }

    try {
      if (hasTagField) {
        const transactionId = String((result.data as { id?: unknown } | null)?.id ?? editingId ?? "");
        if (transactionId) {
          await syncTransactionTags(transactionId);
        }
      }
    } catch (error) {
      setLoading(false);
      setStatus(error instanceof Error ? error.message : "บันทึกแท็กไม่สำเร็จ");
      return;
    }

    setLoading(false);

    setStatus(isEditing ? "อัปเดตข้อมูลเรียบร้อยแล้ว" : "สร้างข้อมูลเรียบร้อยแล้ว");
    resetForm();
    await loadData();
  }

  function handleEdit(row: Record<string, unknown>) {
    setEditingId(row.id);
    setIsEditing(true);
    setForm(
      fields.reduce((acc, field) => {
        if (field.type === "multiselect") {
          const relation = (row.transaction_tags as Array<{ tag_id: string | null }> | undefined) ?? [];
          acc[field.key] = relation.map((item) => item.tag_id).filter((tagId): tagId is string => Boolean(tagId));
        } else {
          acc[field.key] = row[field.key] ?? initialFieldValue(field);
        }
        return acc;
      }, {} as Record<string, unknown>)
    );
    setStatus("แก้ไขรายการแล้ว สามารถแก้ไขฟอร์มและกดบันทึกได้");
  }

  function handleCancelEdit() {
    resetForm();
    setStatus("ยกเลิกการแก้ไข");
  }

  function renderCellValue(row: Record<string, unknown>, colKey: string, value: unknown): ReactNode {
    if (colKey === "tag_ids") {
      const relation = (row.transaction_tags as Array<{ tag_id: string | null }> | undefined) ?? [];
      if (relation.length === 0) return "-";
      const opts = allOptions[colKey] ?? [];
      const labels = relation
        .map((item) => {
          const tagId = item.tag_id;
          if (!tagId) return "";
          const match = opts.find((opt) => String(opt.value) === String(tagId));
          return match ? match.label : tagId;
        })
        .filter((text) => text.length > 0);
      if (labels.length === 0) return "-";
      return (
        <div className={styles.tagList}>
          {labels.map((label) => (
            <span key={`${String(row.id)}-${label}`} className={styles.tagPill}>
              {label}
            </span>
          ))}
        </div>
      );
    }

    const opts = allOptions[colKey];
    if (opts && opts.length > 0 && value !== null && value !== undefined && value !== "") {
      const match = opts.find((o) => String(o.value) === String(value));
      if (match) return match.label;
    }
    return defaultRender(value);
  }

  async function handleDelete(id: unknown) {
    if (!confirm("ลบรายการนี้ใช่หรือไม่?")) return;
    setLoading(true);
    const { error } = await supabase.from(table as any).delete().eq("id", id);
    setLoading(false);
    if (error) {
      setStatus(`ลบข้อมูลไม่สำเร็จ: ${error.message}`);
      return;
    }
    setStatus("ลบข้อมูลเรียบร้อยแล้ว");
    await loadData();
  }

  return (
    <main className={styles.card}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>{title}</h1>
          <p className={styles.subtitle}>{subtitle}</p>
        </div>
        <div className={styles.status}>{status || (loading ? "กำลังโหลด..." : "พร้อมใช้งาน")}</div>
      </div>

      <form className={styles.form} onSubmit={(event) => { event.preventDefault(); handleCreate(); }}>
        {fields.map((field) => (
          <div className={styles.field} key={field.key}>
            <label className={styles.label} htmlFor={field.key}>{field.label}</label>
            {field.type === "textarea" ? (
              <textarea
                id={field.key}
                className={styles.input}
                placeholder={field.placeholder}
                required={field.required}
                value={String(form[field.key] ?? "")}
                onChange={(event) => updateFormValue(field.key, event.target.value)}
              />
            ) : field.type === "select" ? (
              <select
                id={field.key}
                className={styles.select}
                required={field.required}
                value={String(form[field.key] ?? "")}
                onChange={(event) => updateFormValue(field.key, event.target.value)}
              >
                <option value="">
                  {field.optionsQuery && optionsLoading ? "กำลังโหลด..." : field.placeholder ?? "เลือก"}
                </option>
                {(field.options ?? fieldOptions[field.key] ?? []).map((option) => (
                  <option key={String(option.value)} value={String(option.value)}>
                    {option.label}
                  </option>
                ))}
              </select>
            ) : field.type === "multiselect" ? (
              <select
                id={field.key}
                className={styles.select}
                required={field.required}
                multiple
                value={((form[field.key] as string[] | undefined) ?? []).map((item) => String(item))}
                onChange={(event) =>
                  updateFormValue(
                    field.key,
                    Array.from(event.target.selectedOptions).map((option) => option.value)
                  )
                }
              >
                {(field.options ?? fieldOptions[field.key] ?? []).map((option) => (
                  <option key={String(option.value)} value={String(option.value)}>
                    {option.label}
                  </option>
                ))}
              </select>
            ) : field.type === "checkbox" ? (
              <label className={styles.checkbox}>
                <input
                  type="checkbox"
                  checked={Boolean(form[field.key])}
                  onChange={(event) => updateFormValue(field.key, event.target.checked)}
                />
                {field.placeholder || field.label}
              </label>
            ) : (
              <input
                id={field.key}
                className={styles.input}
                type={field.type}
                placeholder={field.placeholder}
                required={field.required}
                value={String(form[field.key] ?? "")}
                onChange={(event) => updateFormValue(field.key, event.target.value)}
              />
            )}
          </div>
        ))}

        <div className={styles.actions}>
          <button type="submit" className={styles.button} disabled={loading}>
            {isEditing ? "อัปเดต" : "สร้างใหม่"}
          </button>
          {isEditing ? (
            <button type="button" className={styles.cancelButton} onClick={handleCancelEdit} disabled={loading}>
              ยกเลิก
            </button>
          ) : null}
        </div>
      </form>

      <table className={styles.table}>
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key}>{col.label}</th>
            ))}
            <th>การกระทำ</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length + 1} className={styles.status}>
                ยังไม่มีข้อมูล
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={String(row.id)}>
                {columns.map((col) => (
                  <td key={`${String(row.id)}-${col.key}`}>{col.render ? col.render(row[col.key]) : renderCellValue(row, col.key, row[col.key])}</td>
                ))}
                <td>
                  <button type="button" className={styles.editButton} onClick={() => handleEdit(row)}>
                    แก้ไข
                  </button>
                  <button type="button" className={styles.deleteButton} onClick={() => handleDelete(row.id)}>
                    ลบ
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </main>
  );
}
