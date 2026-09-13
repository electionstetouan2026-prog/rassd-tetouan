import * as XLSX from "xlsx";
import type { createClient } from "@/lib/supabase/server";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

export type ImportTargetKey = "volunteers" | "activists" | "party_officials" | "observers";

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
  // حقول تُستعمل فقط للمطابقة (مثلا إيجاد مكتب تصويت) وما كتنكتبش
  // مباشرة كعمود فالجدول المستهدف
  virtualFields?: string[];
  // إذا الملف فيه الاسم مقسّم فعمودين (النسب + الإسم) بدل عمود واحد
  // "الاسم الكامل" — يُستعملو لتركيب full_name إذا العمود الرئيسي فارغ
  nameParts?: { firstHeaders: string[]; lastHeaders: string[] };
};

export const IMPORT_TARGETS: Record<ImportTargetKey, ImportTargetConfig> = {
  volunteers: {
    key: "volunteers",
    table: "volunteers",
    label: "المتطوعون",
    redirectPath: "/volunteers",
    hasCommune: true,
    nameParts: { firstHeaders: ["الإسم", "الاسم الشخصي", "الاسم الأول"], lastHeaders: ["النسب", "اسم العائلة", "اللقب"] },
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
    nameParts: { firstHeaders: ["الإسم", "الاسم الشخصي", "الاسم الأول"], lastHeaders: ["النسب", "اسم العائلة", "اللقب"] },
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
    nameParts: { firstHeaders: ["الإسم", "الاسم الشخصي", "الاسم الأول"], lastHeaders: ["النسب", "اسم العائلة", "اللقب"] },
    fields: [
      { key: "full_name", headers: ["الاسم الكامل", "الاسم"], required: true },
      { key: "role", headers: ["الصفة", "الدور"] },
      { key: "commune_name", headers: ["الجماعة"] },
      { key: "category", headers: ["الفئة"] },
      { key: "notes", headers: ["ملاحظات"] },
    ],
  },
  observers: {
    key: "observers",
    table: "observers",
    label: "المراقبون",
    redirectPath: "/observers",
    hasCommune: true,
    nameParts: { firstHeaders: ["الإسم", "الاسم الشخصي", "الاسم الأول"], lastHeaders: ["النسب", "اسم العائلة", "اللقب"] },
    // "الجماعة" و"رقم المكتب"/"اسم المركز"/"البطاقة الوطنية" ما كيتكتبوش
    // كأعمدة فجدول observers مباشرة — الأولين كيتستعملو باش يتلقى مكتب
    // التصويت المطابق (الجدول فيه غير polling_station_id)، والبطاقة
    // الوطنية كتنزاد كسطر داخل "ملاحظات" (الجدول ماعندوش عمود خاص بيها)
    virtualFields: ["commune_name", "station_number", "station_name", "national_id"],
    fields: [
      { key: "full_name", headers: ["الاسم الكامل", "الاسم"], required: true },
      { key: "phone", headers: ["الهاتف"] },
      { key: "commune_name", headers: ["الجماعة"] },
      { key: "station_number", headers: ["رقم المكتب", "رقم مكتب التصويت", "المكتب"] },
      { key: "station_name", headers: ["اسم المركز", "المركز"] },
      { key: "national_id", headers: ["البطاقة الوطنية", "رقم البطاقة الوطنية"] },
      { key: "notes", headers: ["ملاحظات"] },
    ],
  },
};

function normalizeHeader(h: string) {
  return h.trim().replace(/\s+/g, " ");
}

/**
 * يقرأ ملف CSV أو Excel (xlsx/xls) ويرجع صفوف كـ Record<header, value>.
 * ملفات CSV لازم تُقرأ كنص UTF-8 صريح (type: "string") — قراءتها كـ
 * buffer/array خام كتخرب الحروف العربية (mojibake)، لأن XLSX كيفترض
 * ترميز افتراضي (Latin-1/codepage) لملفات CSV الثنائية. ملفات xlsx/xls
 * هي أرشيف ثنائي (zip) — لازم تُقرأ كـ array، ماشي كنص.
 */
export function parseSpreadsheet(buffer: ArrayBuffer, filename: string): Record<string, string>[] {
  const isCsv = /\.csv$/i.test(filename.trim());
  const workbook = isCsv
    ? XLSX.read(new TextDecoder("utf-8").decode(buffer), { type: "string" })
    : XLSX.read(buffer, { type: "array" });
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
  buffer: ArrayBuffer,
  filename: string
): Promise<ImportRunResult> {
  const config = IMPORT_TARGETS[targetKey];
  if (!config) return { ok: false, message: "نوع بيانات غير معروف." };

  let rawRows: Record<string, string>[];
  try {
    rawRows = parseSpreadsheet(buffer, filename);
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

  // مطابقة مكتب التصويت (خاصة بـ observers فقط — الجدول ماعندوش عمود
  // commune_id مباشر، غير polling_station_id)
  const stationsByCommuneAndNumber = new Map<string, string>();
  const stationsByCommuneAndName = new Map<string, string>();
  if (targetKey === "observers") {
    const { data: stationsRaw } = await supabase
      .from("polling_stations")
      .select("id, commune_id, center_name, sub_office_number");
    for (const s of stationsRaw ?? []) {
      const communeId = s.commune_id as string;
      if (s.sub_office_number != null) {
        stationsByCommuneAndNumber.set(`${communeId}|${s.sub_office_number}`, s.id as string);
      }
      if (s.center_name) {
        stationsByCommuneAndName.set(`${communeId}|${normalizeHeader(s.center_name as string).toLowerCase()}`, s.id as string);
      }
    }
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
      if (config.virtualFields?.includes(field.key)) continue; // مطابقة فقط، ماشي عمود
      const value = findValue(row, field.headers);
      if (field.required && !value) {
        missingRequired = true;
      }
      if (value) record[field.key] = value;
    }

    // إذا الاسم الكامل غايب لكن الملف فيه عمودين منفصلين (النسب + الإسم
    // أو ما شابه)، نركبو full_name منهم قبل ما نعتبرو الصف ناقص
    if (!record.full_name && config.nameParts) {
      const first = findValue(row, config.nameParts.firstHeaders);
      const last = findValue(row, config.nameParts.lastHeaders);
      const combined = [first, last].filter(Boolean).join(" ").trim();
      if (combined) {
        record.full_name = combined;
        missingRequired = false;
      }
    }

    if (missingRequired || !record.full_name) {
      skipped.push(`صف ${rowNum}: بلا اسم كامل`);
      return;
    }

    if (targetKey === "observers") {
      const nationalId = findValue(row, ["البطاقة الوطنية", "رقم البطاقة الوطنية"]);
      if (nationalId) {
        const existingNotes = String(record.notes ?? "").trim();
        record.notes = existingNotes ? `${existingNotes} — بطاقة وطنية: ${nationalId}` : `بطاقة وطنية: ${nationalId}`;
      }
    }

    let communeId: string | undefined;
    if (config.hasCommune) {
      const communeField = config.fields.find((f) => f.key === "commune_name");
      const communeName = communeField ? findValue(row, communeField.headers) : "";
      if (communeName) {
        communeId = communesByName.get(normalizeHeader(communeName));
        if (!communeId) {
          communeWarnings.push(
            targetKey === "observers"
              ? `صف ${rowNum}: الجماعة "${communeName}" غير معروفة — تعذّر البحث عن مكتب تصويت`
              : `صف ${rowNum}: الجماعة "${communeName}" غير معروفة — تم الاستيراد بلا ربط جماعة`
          );
        }
      }
    }

    if (targetKey === "party_officials") {
      const category = String(record.category ?? "").trim();
      if (category !== "حالي" && category !== "تاريخي") {
        record.category = "حالي";
      }
    }

    if (targetKey === "observers") {
      // observers ماعندهاش عمود commune_id — الجماعة كتُستعمل غير
      // لإيجاد مكتب التصويت المطابق
      const stationNumberRaw = findValue(row, ["رقم المكتب", "رقم مكتب التصويت"]);
      const stationNameRaw = findValue(row, ["اسم المركز", "المركز"]);
      let stationId: string | undefined;
      if (communeId && stationNumberRaw) {
        const num = parseInt(stationNumberRaw, 10);
        if (!Number.isNaN(num)) stationId = stationsByCommuneAndNumber.get(`${communeId}|${num}`);
      }
      if (!stationId && communeId && stationNameRaw) {
        stationId = stationsByCommuneAndName.get(`${communeId}|${normalizeHeader(stationNameRaw).toLowerCase()}`);
      }
      if (stationId) {
        record.polling_station_id = stationId;
        record.confirmation_status = "غير مؤكد";
      } else {
        record.confirmation_status = "لم يُعيّن";
        if (stationNumberRaw || stationNameRaw) {
          communeWarnings.push(`صف ${rowNum}: تعذّر إيجاد مكتب التصويت المطابق — تم الاستيراد بلا ربط مكتب`);
        }
      }
    } else if (config.hasCommune && communeId) {
      record.commune_id = communeId;
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
