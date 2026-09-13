import * as XLSX from "xlsx";
import type { createClient } from "@/lib/supabase/server";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

export type ImportTargetKey = "volunteers" | "activists" | "party_officials";

type FieldSpec = {
  key: string;
  headers: string[]; // أول رأس هو المعروض فالتعليمات، الباقي بدائل مقبولة
  required?: boolean;
};

export type ImportTargetConfig = {
  key: ImportTargetKey;
  table: string;
  label: string;
  redirectPath: string;
  fields: FieldSpec[];
  hasCommune: boolean;
};

export const IMPORT_TARGETS: Record<ImportTargetKey, ImportTargetConfig> = {
  volunteers: {
    key: "volunteers",
    table: "volunteers",
    label: "المتطوعون",
    redirectPath: "/volunteers",
    hasCommune: true,
    fields: [
      { key: "full_name", headers: ["الاسم الكامل", "الاسم"], required: true },
      { key: "phone", headers: ["الهاتف"] },
      { key: "email", headers: ["البريد الإلكتروني", "البريد"] },
      { key: "commune_name", headers: ["الجماعة"] },
      { key: "skills", headers: ["المهارات"] },
      { key: "availability", headers: ["التوفر"] },
      { key: "notes", headers: ["ملاحظات"] },
    ],
  },
  activists: {
    key: "activists",
    table: "activists",
    label: "المناضلون",
    redirectPath: "/activists",
    hasCommune: true,
    fields: [
      { key: "full_name", headers: ["الاسم الكامل", "الاسم"], required: true },
      { key: "phone", headers: ["الهاتف"] },
      { key: "email", headers: ["البريد الإلكتروني", "البريد"] },
      { key: "membership_number", headers: ["رقم الانخراط"] },
      { key: "commune_name", headers: ["الجماعة"] },
      { key: "local_branch", headers: ["الفرع المحلي"] },
      { key: "responsibility", headers: ["المسؤولية"] },
      { key: "notes", headers: ["ملاحظات"] },
    ],
  },
  party_officials: {
    key: "party_officials",
    table: "party_officials",
    label: "مسؤولو/مرشحو الحزب",
    redirectPath: "/electoral-context",
    hasCommune: true,
    fields: [
      { key: "full_name", headers: ["الاسم الكامل", "الاسم"], required: true },
      { key: "role", headers: ["الصفة", "الدور"] },
      { key: "commune_name", headers: ["الجماعة"] },
      { key: "category", headers: ["الفئة"] },
      { key: "notes", headers: ["ملاحظات"] },
    ],
  },
};

function normalizeHeader(h: string) {
  return h.trim().replace(/\s+/g, " ");
}

/** يقرأ ملف CSV أو Excel (xlsx/xls) ويرجع صفوف كـ Record<header, value> */
export function parseSpreadsheet(buffer: ArrayBuffer): Record<string, string>[] {
  const workbook = XLSX.read(buffer, { type: "array" });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) return [];
  const sheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "", raw: false });
  return rows.map((row) => {
    const clean: Record<string, string> = {};
    for (const [k, v] of Object.entries(row)) {
      clean[normalizeHeader(k)] = String(v ?? "").trim();
    }
    return clean;
  });
}

function findValue(row: Record<string, string>, headers: string[]): string {
  for (const h of headers) {
    const key = Object.keys(row).find((k) => k === h);
    if (key && row[key]) return row[key];
  }
  return "";
}

export type ImportRunResult = {
  ok: boolean;
  message: string;
  totalRows?: number;
  insertedCount?: number;
  skipped?: string[];
  communeWarnings?: string[];
};

export async function runSpreadsheetImport(
  supabase: SupabaseClient,
  targetKey: ImportTargetKey,
  buffer: ArrayBuffer
): Promise<ImportRunResult> {
  const config = IMPORT_TARGETS[targetKey];
  if (!config) return { ok: false, message: "نوع بيانات غير معروف." };

  let rawRows: Record<string, string>[];
  try {
    rawRows = parseSpreadsheet(buffer);
  } catch {
    return { ok: false, message: "تعذّرت قراءة الملف — تأكد أنه CSV أو Excel (xlsx/xls) صحيح." };
  }

  if (rawRows.length === 0) {
    return { ok: false, message: "الملف فارغ أو ماكاينش صف بيانات بعد رأس الأعمدة." };
  }

  let communesByName = new Map<string, string>();
  if (config.hasCommune) {
    const { data: communesRaw } = await supabase.from("communes").select("id, name");
    communesByName = new Map((communesRaw ?? []).map((c) => [normalizeHeader(c.name as string), c.id as string]));
  }

  const toInsert: Record<string, unknown>[] = [];
  const skipped: string[] = [];
  const communeWarnings: string[] = [];

  rawRows.forEach((row, idx) => {
    const rowNum = idx + 2; // +2: صف 1 هو الرأس، والفهرسة تبدأ من 0
    const record: Record<string, unknown> = {};
    let missingRequired = false;

    for (const field of config.fields) {
      if (field.key === "commune_name") continue; // يُعالج بعده
      const value = findValue(row, field.headers);
      if (field.required && !value) {
        missingRequired = true;
      }
      if (value) record[field.key] = value;
    }

    if (missingRequired) {
      skipped.push(`صف ${rowNum}: بلا اسم كامل`);
      return;
    }

    if (config.hasCommune) {
      const communeField = config.fields.find((f) => f.key === "commune_name");
      const communeName = communeField ? findValue(row, communeField.headers) : "";
      if (communeName) {
        const id = communesByName.get(normalizeHeader(communeName));
        if (id) {
          record.commune_id = id;
        } else {
          communeWarnings.push(`صف ${rowNum}: الجماعة "${communeName}" غير معروفة — تم الاستيراد بلا ربط جماعة`);
        }
      }
    }

    if (targetKey === "party_officials") {
      const category = String(record.category ?? "").trim();
      if (category !== "حالي" && category !== "تاريخي") {
        record.category = "حالي";
      }
    }

    toInsert.push(record);
  });

  if (toInsert.length === 0) {
    return {
      ok: false,
      message: "لا يوجد أي صف صالح للاستيراد (كلهم بلا اسم كامل).",
      totalRows: rawRows.length,
      skipped,
    };
  }

  const chunkSize = 500;
  let insertedCount = 0;
  const insertErrors: string[] = [];
  for (let i = 0; i < toInsert.length; i += chunkSize) {
    const chunk = toInsert.slice(i, i + chunkSize);
    const { error, count } = await supabase.from(config.table).insert(chunk, { count: "exact" });
    if (error) {
      insertErrors.push(error.message);
    } else {
      insertedCount += count ?? chunk.length;
    }
  }

  if (insertErrors.length > 0 && insertedCount === 0) {
    return { ok: false, message: `فشل الاستيراد: ${insertErrors[0]}` };
  }

  return {
    ok: true,
    message: `تم استيراد ${insertedCount} من أصل ${rawRows.length} صف إلى "${config.label}".`,
    totalRows: rawRows.length,
    insertedCount,
    skipped,
    communeWarnings,
  };
}
