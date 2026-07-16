"use client";

import { ReactNode, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import styles from "./form-card.module.css";

export type FieldType = "text" | "number" | "textarea" | "select" | "multiselect" | "checkbox" | "date" | "file";

export type FieldDef = {
  key: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  required?: boolean;
  defaultValue?: string | number | boolean;
  options?: { label: string; value: string | number | boolean }[];
  optionsQuery?: {
    table: string;
    labelKey: string;
    labelKeys?: string[];
    labelSeparator?: string;
    valueKey: string;
    filter?: Record<string, string | number | boolean>;
    filterByUserId?: boolean;          // โอนเงิน: ฉัน + แฟน + บัญชีคู่
    filterByCurrentUserOnly?: boolean; // รายรับ/รายจ่าย: เฉพาะบัญชีส่วนตัวของฉัน
    orderBy?: string;
    orderAscending?: boolean;
  };
};

type ColumnDef = {
  key: string;
  label: string;
  render?: (value: unknown, row: Record<string, unknown>) => ReactNode;
};

type CrudPageProps = {
  title: string;
  subtitle: string;
  table: string;
  columns: ColumnDef[];
  fields: FieldDef[];
  filter?: { field: string; value: string | number | boolean | null };
  additionalPayload?: Record<string, unknown>;
  orderBy?: string;
  orderAscending?: boolean;
  pageSize?: number;
};

function defaultRender(value: unknown) {
  if (value === null || value === undefined) return "-";
  if (typeof value === "boolean") return value ? "ใช่" : "ไม่ใช่";
  if (typeof value === "number") return String(value);
  return String(value);
}

function initialFieldValue(field: FieldDef) {
  if (field.defaultValue !== undefined) return field.defaultValue;
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
  additionalPayload,
  orderBy = "created_at",
  orderAscending = false,
  pageSize = 50,
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
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

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
        // ดึง user ปัจจุบัน + partner (ถ้าจำเป็น)
        let currentUserId: string | null = null;
        let partnerUserId: string | null = null;
        const needsUserFilter = queryFields.some(
          (f) => f.optionsQuery?.filterByUserId || f.optionsQuery?.filterByCurrentUserOnly
        );
        if (needsUserFilter) {
          const { data: { user } } = await supabase.auth.getUser();
          currentUserId = user?.id ?? null;

          // ดึง partner user_id เฉพาะเมื่อมี filterByUserId (โอนเงิน)
          const needsPartner = queryFields.some((f) => f.optionsQuery?.filterByUserId);
          if (currentUserId && needsPartner) {
            const { data: myMember } = await supabase
              .from("couple_members")
              .select("couple_id")
              .eq("user_id", currentUserId)
              .maybeSingle();

            if (myMember?.couple_id) {
              const { data: allMembers } = await supabase
                .from("couple_members")
                .select("user_id")
                .eq("couple_id", myMember.couple_id);

              partnerUserId = allMembers?.find((m) => m.user_id !== currentUserId)?.user_id ?? null;
            }
          }
        }

        const resolved = await Promise.all(
          queryFields.map(async (field) => {
            const queryDef = field.optionsQuery!;
            const selectCols = [queryDef.valueKey, queryDef.labelKey, ...(queryDef.labelKeys ?? [])].join(",");
            let query = supabase.from(queryDef.table as any).select(selectCols);

            if (queryDef.filter) {
              Object.entries(queryDef.filter).forEach(([key, value]) => {
                query = query.eq(key, value as any);
              });
            }

            // โอนเงิน: บัญชีของฉัน + บัญชีของแฟน + บัญชีคู่
            if (queryDef.filterByUserId && currentUserId) {
              const orParts = [`user_id.eq.${currentUserId}`, `couple_id.not.is.null`];
              if (partnerUserId) orParts.push(`user_id.eq.${partnerUserId}`);
              query = query.or(orParts.join(","));
            }

            // รายรับ/รายจ่าย: เฉพาะบัญชีส่วนตัวของฉันเท่านั้น
            if (queryDef.filterByCurrentUserOnly && currentUserId) {
              query = query.eq("user_id", currentUserId as any);
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
                ? data.map((row) => {
                    const r = row as any;
                    let label = String(r[queryDef.labelKey] ?? "");
                    if (queryDef.labelKeys && queryDef.labelKeys.length > 0) {
                      const sep = queryDef.labelSeparator ?? " ";
                      const extras = queryDef.labelKeys
                        .map((k) => {
                          if (k.includes('(')) {
                            const table = k.split('(')[0];
                            const field = k.split('(')[1].replace(')', '');
                            return r[table]?.[field];
                          }
                          return r[k];
                        })
                        .filter((v) => v !== null && v !== undefined && v !== "");
                      if (extras.length > 0) label += sep + extras.join(sep);
                    }
                    return { label, value: r[queryDef.valueKey] ?? "" };
                  })
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

  async function loadData(page = currentPage) {
    setLoading(true);
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase.from(table as any).select("*", { count: "exact" });
    if (table === "transactions") {
      query = query.is("deleted_at", null);
    }
    if (filter) {
      if (filter.value === null) {
        query = query.is(filter.field, null);
      } else {
        query = query.eq(filter.field, filter.value);
      }
    }
    if (orderBy) {
      query = query.order(orderBy, { ascending: orderAscending });
    }
    const { data, error, count } = await query.range(from, to);
    setLoading(false);
    if (error) {
      setStatus(`โหลดข้อมูล ${table} ไม่สำเร็จ: ${error.message}`);
      setRows([]);
      return;
    }

    setTotalCount(count ?? 0);

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
    setCurrentPage(1);
    loadData(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, orderBy, orderAscending, table, pageSize]);

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
    const payload = {
      ...additionalPayload,
      ...fields.reduce((acc, field) => {
        const value = form[field.key];
        if (field.type === "multiselect") {
          return acc;
        }
        if (field.type === "number") {
          acc[field.key] = value === "" || value === null || value === undefined
            ? (field.defaultValue !== undefined ? Number(field.defaultValue) : null)
            : Number(value);
        } else if (field.type === "select") {
          acc[field.key] = value === "" ? null : value;
        } else {
          acc[field.key] = value;
        }
        return acc;
      }, {} as Record<string, unknown>)
    };

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
    
    let error;
    if (table === "transactions") {
      const result = await supabase.from(table).update({ deleted_at: new Date().toISOString() }).eq("id", id);
      error = result.error;
    } else {
      const result = await supabase.from(table as any).delete().eq("id", id);
      error = result.error;
    }
    
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
            ) : field.type === "file" ? (
              <div className={styles.fileUploadArea}>
                {form[field.key] ? (
                  <div className={styles.filePreview}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={String(form[field.key])} alt="Uploaded preview" className={styles.thumbnail} />
                    <button
                      type="button"
                      className={styles.deleteFileBtn}
                      onClick={() => updateFormValue(field.key, "")}
                    >
                      ✕ ลบรูปภาพ
                    </button>
                  </div>
                ) : (
                  <input
                    type="file"
                    accept="image/*"
                    onChange={async (event) => {
                      const file = event.target.files?.[0];
                      if (!file) return;

                      setStatus("กำลังอัปโหลดรูปภาพ...");
                      try {
                        const { data: { user } } = await supabase.auth.getUser();
                        if (!user) throw new Error("กรุณาเข้าสู่ระบบก่อนอัปโหลด");

                        const fileExt = file.name.split(".").pop();
                        const fileName = `${user.id}/${Date.now()}.${fileExt}`;
                        
                        const { error: uploadError } = await supabase.storage
                          .from("receipts")
                          .upload(fileName, file);

                        if (uploadError) throw uploadError;

                        const { data: { publicUrl } } = supabase.storage
                          .from("receipts")
                          .getPublicUrl(fileName);

                        updateFormValue(field.key, publicUrl);
                        setStatus("อัปโหลดสำเร็จ! กดบันทึกเพื่อบันทึกรายการ");
                      } catch (err: any) {
                        setStatus(`อัปโหลดล้มเหลว: ${err.message}`);
                      }
                    }}
                  />
                )}
              </div>
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

      <div className={styles.tableWrap}>
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
                    <td key={`${String(row.id)}-${col.key}`}>{col.render ? col.render(row[col.key], row) : renderCellValue(row, col.key, row[col.key])}</td>
                  ))}
                  <td className={styles.rowActions}>
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
      </div>

      {/* Mobile card list — shown only on small screens instead of table */}
      <div className={styles.mobileCardList}>
        {rows.length === 0 ? (
          <p className={styles.status}>ยังไม่มีข้อมูล</p>
        ) : (
          rows.map((row) => (
            <div key={String(row.id)} className={styles.mobileCard}>
              {columns.map((col) => {
                const val = col.render ? col.render(row[col.key], row) : renderCellValue(row, col.key, row[col.key]);
                if (val === null || val === undefined || val === "-" || val === "") return null;
                return (
                  <div key={col.key} className={styles.mobileCardRow}>
                    <span className={styles.mobileCardLabel}>{col.label}</span>
                    <span className={styles.mobileCardValue}>{val}</span>
                  </div>
                );
              })}
              <div className={styles.mobileCardActions}>
                <button type="button" className={styles.editButton} onClick={() => handleEdit(row)}>แก้ไข</button>
                <button type="button" className={styles.deleteButton} onClick={() => handleDelete(row.id)}>ลบ</button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalCount > pageSize && (
        <div className={styles.pagination}>
          <span className={styles.pageInfo}>
            {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, totalCount)} จาก {totalCount.toLocaleString("th-TH")} รายการ
          </span>
          <div className={styles.pageButtons}>
            <button
              className={styles.pageBtn}
              onClick={() => { setCurrentPage(1); loadData(1); }}
              disabled={currentPage === 1 || loading}
            >«</button>
            <button
              className={styles.pageBtn}
              onClick={() => { const p = currentPage - 1; setCurrentPage(p); loadData(p); }}
              disabled={currentPage === 1 || loading}
            >‹</button>
            <span className={styles.pageCurrent}>{currentPage} / {Math.ceil(totalCount / pageSize)}</span>
            <button
              className={styles.pageBtn}
              onClick={() => { const p = currentPage + 1; setCurrentPage(p); loadData(p); }}
              disabled={currentPage * pageSize >= totalCount || loading}
            >›</button>
            <button
              className={styles.pageBtn}
              onClick={() => { const p = Math.ceil(totalCount / pageSize); setCurrentPage(p); loadData(p); }}
              disabled={currentPage * pageSize >= totalCount || loading}
            >»</button>
          </div>
        </div>
      )}
    </main>
  );
}
