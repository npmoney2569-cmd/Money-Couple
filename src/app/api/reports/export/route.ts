import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function csvEscape(value: unknown) {
  if (value === null || value === undefined) {
    return "";
  }
  const text = String(value);
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export async function GET() {
  const supabase = await createClient();
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
  const monthEnd = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("transactions")
    .select("id,type,amount,date,account_id,to_account_id,category_id,merchant,payee,note,fee_amount,source")
    .gte("date", monthStart)
    .lte("date", monthEnd)
    .is("deleted_at", null)
    .order("date", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const headers = [
    "id",
    "type",
    "amount",
    "date",
    "account_id",
    "to_account_id",
    "category_id",
    "merchant",
    "payee",
    "note",
    "fee_amount",
    "source",
  ];

  const csv = [headers.join(",")]
    .concat(
      (data ?? []).map((row) =>
        headers
          .map((key) => csvEscape((row as Record<string, unknown>)[key]))
          .join(",")
      )
    )
    .join("\n");

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": "attachment; filename=transactions-monthly.csv",
    },
  });
}
