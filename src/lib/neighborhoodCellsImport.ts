import { parseSpreadsheet } from "./importEngine";
import type { createClient } from "@/lib/supabase/server";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

export type NeighborhoodCellsImportResult = {
  ok: boolean;
  message: string;
  totalRows?: number;
  zonesCreated?: number;
  cellsInserted?: number;
  duplicates?: string[];
  skipped?: string[];
};

const ZONE_HEADERS = ["الخلية", "الحي", "اسم الحي", "اسم المنطقة"];
const CONTACT_HEADERS = ["المسؤول عن الخلية", "المسؤول", "الاسم الكامل", "الاسم"];
const PHONE_HEADERS = ["رقم الهاتف", "الهاتف"];
const ORDER_HEADERS = ["الترتيب", "رقم"];
const OBSERVERS_HEADERS = ["عدد المراقبين", "المراقبين المستهدفين"];

function findValue(row: Record<string, string>, headers: string[]): string {
  for (const h of headers) {
    const key = Object.keys(row).find((k) => k === h);
    if (key && row[key]) return row[key];
  }
  return "";
}

// تطبيع اسم المنطقة/جهة الاتصال للمقارنة (بلا حساسية للمسافات/الهمزات)
function normalize(v: string): string {
  return v
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[إأآا]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .toLowerCase();
}

function normalizePhone(v: string): string {
  return v.replace(/[^\d]/g, "");
}

/**
 * كيقرا ملف "خلايا الأحياء" (خلية/حي + المسؤول عنها + هاتفو + ترتيب
 * اختياري + عدد مراقبين مستهدف اختياري)، وكيدمجها فبنية commune_zones
 * + zone_cells الموجودة سلفا (نفس الجداول لي كتغذي /presence و
 * التغطية الميدانية المستعملة فـ /hot-blocks و /stronghold-map).
 * كل صف = خلية واحدة داخل حي/منطقة (zone) تابعة للجماعة المختارة —
 * إذا الحي ماكاينش بعد كـ zone، كيتزاد تلقائيا (zone_type: حي).
 */
export async function runNeighborhoodCellsImport(
  supabase: SupabaseClient,
  communeId: string,
  buffer: ArrayBuffer,
  filename: string
): Promise<NeighborhoodCellsImportResult> {
  let rawRows: Record<string, string>[];
  try {
    rawRows = parseSpreadsheet(buffer, filename);
  } catch {
    return { ok: false, message: "تعذّرت قراءة الملف — تأكد أنه CSV أو Excel (xlsx/xls) صحيح." };
  }

  if (rawRows.length === 0) {
    return { ok: false, message: "الملف فارغ أو ماكاينش صف بيانات بعد رأس الأعمدة." };
  }

  // الأحياء (zones) الموجودة سلفا لهاد الجماعة
  const { data: existingZonesRaw } = await supabase
    .from("commune_zones")
    .select("id, name")
    .eq("commune_id", communeId);
  const zoneIdByName = new Map<string, string>();
  for (const z of existingZonesRaw ?? []) {
    zoneIdByName.set(normalize(String(z.name)), String(z.id));
  }

  // خلايا موجودة سلفا (لتفادي التكرار عند إعادة استيراد نفس الملف) —
  // مطابقة بـ zone_id + هاتف (أو زone_id + اسم المسؤول إذا بلا هاتف)
  const existingCellKeys = new Set<string>();
  {
    const zoneIds = Array.from(zoneIdByName.values());
    if (zoneIds.length > 0) {
      const { data: existingCellsRaw } = await supabase
        .from("zone_cells")
        .select("zone_id, contact_name, contact_phone")
        .in("zone_id", zoneIds);
      for (const c of existingCellsRaw ?? []) {
        const phone = normalizePhone(String(c.contact_phone ?? ""));
        const name = normalize(String(c.contact_name ?? ""));
        existingCellKeys.add(`${c.zone_id}|${phone || name}`);
      }
    }
  }

  const skipped: string[] = [];
  const duplicates: string[] = [];
  const zonesToCreate: string[] = []; // أسماء أحياء جداد (بلا تكرار)
  const seenZoneNamesToCreate = new Set<string>();

  type PendingCell = {
    rowNum: number;
    zoneName: string;
    contactName: string | null;
    contactPhone: string | null;
    notes: string | null;
    dedupKey: string;
  };
  const pendingCells: PendingCell[] = [];
  const seenInFile = new Set<string>();

  rawRows.forEach((row, idx) => {
    const rowNum = idx + 2;
    const zoneNameRaw = findValue(row, ZONE_HEADERS).trim();
    if (!zoneNameRaw) {
      skipped.push(`صف ${rowNum}: بلا اسم حي/خلية`);
      return;
    }

    const contactName = findValue(row, CONTACT_HEADERS).trim() || null;
    const contactPhone = findValue(row, PHONE_HEADERS).trim() || null;
    const orderVal = findValue(row, ORDER_HEADERS).trim();
    const observersVal = findValue(row, OBSERVERS_HEADERS).trim();

    const notesParts = [
      orderVal ? `ترتيب: ${orderVal}` : null,
      observersVal ? `عدد المراقبين المستهدف: ${observersVal}` : null,
    ].filter(Boolean);
    const notes = notesParts.length ? notesParts.join(" — ") : null;

    const normalizedZone = normalize(zoneNameRaw);
    if (!zoneIdByName.has(normalizedZone) && !seenZoneNamesToCreate.has(normalizedZone)) {
      seenZoneNamesToCreate.add(normalizedZone);
      zonesToCreate.push(zoneNameRaw);
    }

    const phoneKey = normalizePhone(contactPhone ?? "");
    const nameKey = normalize(contactName ?? "");
    const dedupKey = `${normalizedZone}|${phoneKey || nameKey || `row${rowNum}`}`;

    if (existingCellKeys.has(`${normalizedZone}|${phoneKey || nameKey}`) && (phoneKey || nameKey)) {
      duplicates.push(`صف ${rowNum}: "${contactName ?? "بلا اسم"}" فحي "${zoneNameRaw}" — موجود مسبقا`);
      return;
    }
    if (seenInFile.has(dedupKey) && (phoneKey || nameKey)) {
      duplicates.push(`صف ${rowNum}: "${contactName ?? "بلا اسم"}" فحي "${zoneNameRaw}" — مكرر داخل نفس الملف`);
      return;
    }
    seenInFile.add(dedupKey);

    pendingCells.push({
      rowNum,
      zoneName: zoneNameRaw,
      contactName,
      contactPhone,
      notes,
      dedupKey,
    });
  });

  // نزيدو الأحياء الجداد أولا، باش نلقاو لهم id قبل ما ندخلو الخلايا
  let zonesCreated = 0;
  if (zonesToCreate.length > 0) {
    const { data: insertedZones, error } = await supabase
      .from("commune_zones")
      .insert(
        zonesToCreate.map((name) => ({
          commune_id: communeId,
          name,
          zone_type: "حي",
          our_offices_count: 0,
        }))
      )
      .select("id, name");
    if (error) {
      console.error("runNeighborhoodCellsImport zones insert error:", JSON.stringify(error));
      return { ok: false, message: `تعذّر إنشاء الأحياء الجداد: ${error.message}` };
    }
    for (const z of insertedZones ?? []) {
      zoneIdByName.set(normalize(String(z.name)), String(z.id));
    }
    zonesCreated = insertedZones?.length ?? 0;
  }

  const cellsToInsert = pendingCells.map((c) => ({
    zone_id: zoneIdByName.get(normalize(c.zoneName)),
    cell_name: null,
    contact_name: c.contactName,
    contact_phone: c.contactPhone,
    notes: c.notes,
  }));

  let cellsInserted = 0;
  const chunkSize = 500;
  for (let i = 0; i < cellsToInsert.length; i += chunkSize) {
    const chunk = cellsToInsert.slice(i, i + chunkSize);
    const { error, count } = await supabase.from("zone_cells").insert(chunk, { count: "exact" });
    if (error) {
      console.error("runNeighborhoodCellsImport cells insert error:", JSON.stringify(error));
      return {
        ok: cellsInserted > 0,
        message: `تم إنشاء ${zonesCreated} حي جديد، لكن وقع خطأ فتسجيل الخلايا: ${error.message}`,
        totalRows: rawRows.length,
        zonesCreated,
        cellsInserted,
        duplicates,
        skipped,
      };
    }
    cellsInserted += count ?? chunk.length;
  }

  return {
    ok: true,
    message: `تم استيراد ${cellsInserted} خلية عبر ${zonesCreated > 0 ? `${zonesCreated} حي جديد + ` : ""}أحياء موجودة، من أصل ${rawRows.length} صف${
      duplicates.length > 0 ? ` (تم تجاوز ${duplicates.length} مكرر/موجود مسبقا)` : ""
    }.`,
    totalRows: rawRows.length,
    zonesCreated,
    cellsInserted,
    duplicates,
    skipped,
  };
}
