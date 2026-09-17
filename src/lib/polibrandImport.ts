import { parseSpreadsheet } from "./importEngine";
import { matchEntities } from "./polibrandEntities";
import type { createClient } from "@/lib/supabase/server";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

// المنصات الثلاثة اللي كيصدّر منها بوليبراند (زر "Exporter" فصفحة
// /mentions ديالو) — كل ملف مصدَّر خاص بمنصة واحدة فقط، ماكاينش عمود
// "platform" فالملف نفسه يميزهم (Facebook وInstagram عندهم بالضبط
// نفس رؤوس الأعمدة)
export type PolibrandPlatform = "صحافة" | "فيسبوك" | "انستغرام";

// تحويل منصة الاستيراد لقيمة enum المقبولة فـ digital_watch_entries.platform
const DIGITAL_WATCH_PLATFORM_LABEL: Record<PolibrandPlatform, string> = {
  "صحافة": "صحافة/موقع",
  "فيسبوك": "فيسبوك",
  "انستغرام": "انستغرام",
};

export type PolibrandImportResult = {
  ok: boolean;
  message: string;
  totalRows?: number;
  rawInsertedCount?: number;
  relevantCount?: number;
  digitalWatchCreatedCount?: number;
  duplicateCount?: number;
  error?: string | null;
};

function parseIntOrNull(v: string | undefined): number | null {
  const trimmed = (v ?? "").trim();
  if (!trimmed) return null;
  const n = parseInt(trimmed, 10);
  return Number.isFinite(n) ? n : null;
}

function parseNumberOrNull(v: string | undefined): number | null {
  const trimmed = (v ?? "").trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

// عمود "Niveau" فبوليبراند: Faible / Modéré / Critique — كيتحول
// لأولوية بمنصتنا. "Menace" (oui/non) كيتحول للشعور الافتراضي.
function deriveSentimentAndPriority(menace: boolean, niveau: string) {
  const sentiment = menace ? "سلبي" : "محايد"; // القرار المعتمد: الافتراضي محايد إلا كان تهديد مؤكد، الفريق كيرفعها يدويا لإيجابي عند المراجعة
  let priority: "عادي" | "مهم" | "عاجل" = "عادي";
  if (menace && niveau.trim() === "Critique") priority = "عاجل";
  else if (menace) priority = "مهم";
  return { sentiment, priority };
}

/**
 * كيقرا ملف Excel واحد مصدَّر من بوليبراند (منصة واحدة محددة سلفا)،
 * كيخزّن كل الصفوف كأرشيف خام فـ polibrand_mentions، وكيولد تلقائيا
 * سطر فـ digital_watch_entries لكل صف "متعلق" (matched_entities غير
 * فارغة). التكرار عند إعادة استيراد نفس الفترة كيتافى بـ
 * (platform, content_url).
 */
export async function runPolibrandImport(
  supabase: SupabaseClient,
  platform: PolibrandPlatform,
  buffer: ArrayBuffer,
  filename: string
): Promise<PolibrandImportResult> {
  let rawRows: Record<string, string>[];
  try {
    rawRows = parseSpreadsheet(buffer, filename);
  } catch {
    return { ok: false, message: `تعذّرت قراءة ملف "${platform}" — تأكد أنه ملف Excel (xlsx) مُصدَّر من بوليبراند دون تعديل.` };
  }

  if (rawRows.length === 0) {
    return { ok: false, message: `ملف "${platform}" فارغ أو ماكاينش صف بيانات بعد رأس الأعمدة.` };
  }

  // جلب الروابط المستوردة مسبقا لهاد المنصة، لتفادي تكرار نفس
  // الإشارة عند إعادة تصدير فترة متداخلة.
  // ملاحظة: Supabase/PostgREST كيحدد 1000 صف كحد أقصى فكل استعلام —
  // خاصنا نجيبو الصفحات كاملة (paginate) وإلا الجدول كبر أكثر من
  // 1000 إشارة، غادي يعاود يستورد صفوف قديمة كأنها جديدة.
  const seenUrls = new Set<string>();
  {
    const pageSize = 1000;
    for (let from = 0; ; from += pageSize) {
      const { data: page, error: pageError } = await supabase
        .from("polibrand_mentions")
        .select("content_url")
        .eq("platform", platform)
        .not("content_url", "is", null)
        .range(from, from + pageSize - 1);
      if (pageError) {
        console.error("runPolibrandImport existingRaw select error:", JSON.stringify(pageError));
        break;
      }
      for (const r of page ?? []) seenUrls.add(String(r.content_url));
      if (!page || page.length < pageSize) break;
    }
  }

  const importBatchId = crypto.randomUUID();
  const rawToInsert: Record<string, unknown>[] = [];
  const watchToInsert: Record<string, unknown>[] = [];
  let duplicateCount = 0;
  let relevantCount = 0;

  for (const row of rawRows) {
    const contentUrl = (row["Lien"] ?? "").trim();
    if (contentUrl && seenUrls.has(contentUrl)) {
      duplicateCount++;
      continue;
    }
    if (contentUrl) seenUrls.add(contentUrl); // تفادي تكرار داخل نفس الملف

    const dateRaw = (row["Date"] ?? "").trim();
    const entryDate = dateRaw ? dateRaw.slice(0, 10) : new Date().toISOString().slice(0, 10);
    const niveau = (row["Niveau"] ?? "").trim();
    const menace = (row["Menace"] ?? "").trim().toLowerCase() === "oui";
    const score = parseNumberOrNull(row["Score"]);
    const termesDetectes = (row["Termes détectés"] ?? "").trim();
    const entities = matchEntities(termesDetectes);
    const sourceName = (row["Source"] ?? "").trim() || null;
    const author = (row["Auteur"] ?? "").trim() || null;
    const title = (row["Titre"] ?? "").trim() || null;
    const textExcerpt = (row["Texte"] ?? "").trim() || null;
    const justification = (row["Justification"] ?? "").trim() || null;

    rawToInsert.push({
      entry_date: entryDate,
      platform,
      source_name: sourceName,
      author,
      title,
      text_excerpt: textExcerpt,
      content_url: contentUrl || null,
      niveau: niveau || null,
      score,
      menace,
      justification,
      quoted_excerpt: (row["Extrait cité"] ?? "").trim() || null,
      termes_detectes: termesDetectes || null,
      matched_entities: entities.length ? entities.join(", ") : null,
      reactions: parseIntOrNull(row["Réactions"]),
      comments_count: parseIntOrNull(row["Commentaires"]),
      shares: parseIntOrNull(row["Partages"]),
      import_batch_id: importBatchId,
    });

    if (entities.length > 0) {
      relevantCount++;
      const { sentiment, priority } = deriveSentimentAndPriority(menace, niveau);
      const headline = title || textExcerpt?.slice(0, 200) || "إشارة مستوردة من بوليبراند";
      const contentSummary = `[بوليبراند] ${headline} — يخص: ${entities.join("، ")}`.slice(0, 1000);
      const notesParts = [
        niveau ? `شدة بوليبراند: ${niveau}` : null,
        score != null ? `Score: ${score}` : null,
        justification ? `تبرير بوليبراند: ${justification}` : null,
      ].filter(Boolean);

      watchToInsert.push({
        entry_date: entryDate,
        platform: DIGITAL_WATCH_PLATFORM_LABEL[platform],
        source_name: sourceName || author,
        content_summary: contentSummary,
        content_url: contentUrl || null,
        sentiment,
        priority,
        status: "جديد",
        notes: notesParts.length ? notesParts.join(" — ") : null,
      });
    }
  }

  const chunkSize = 500;
  let rawInsertedCount = 0;
  let firstInsertError: string | null = null;
  for (let i = 0; i < rawToInsert.length; i += chunkSize) {
    const chunk = rawToInsert.slice(i, i + chunkSize);
    const { error, count } = await supabase.from("polibrand_mentions").insert(chunk, { count: "exact" });
    if (!error) {
      rawInsertedCount += count ?? chunk.length;
    } else {
      console.error("runPolibrandImport polibrand_mentions insert error:", JSON.stringify(error));
      if (!firstInsertError) firstInsertError = `${error.message}${error.code ? ` (${error.code})` : ""}`;
    }
  }

  let digitalWatchCreatedCount = 0;
  for (let i = 0; i < watchToInsert.length; i += chunkSize) {
    const chunk = watchToInsert.slice(i, i + chunkSize);
    const { error, count } = await supabase.from("digital_watch_entries").insert(chunk, { count: "exact" });
    if (!error) {
      digitalWatchCreatedCount += count ?? chunk.length;
    } else {
      console.error("runPolibrandImport digital_watch_entries insert error:", JSON.stringify(error));
      if (!firstInsertError) firstInsertError = `${error.message}${error.code ? ` (${error.code})` : ""}`;
    }
  }

  if (rawToInsert.length === 0) {
    return {
      ok: true,
      message: `ملف "${platform}": كل الصفوف (${duplicateCount}) مستوردة مسبقا — لا شيء جديد.`,
      totalRows: rawRows.length,
      rawInsertedCount: 0,
      relevantCount: 0,
      digitalWatchCreatedCount: 0,
      duplicateCount,
    };
  }

  return {
    ok: true,
    message: `ملف "${platform}": تم أرشفة ${rawInsertedCount} إشارة، منها ${digitalWatchCreatedCount} متعلقة بالمرشح/منافس وتزادت فـ"اليقظة الرقمية" تلقائيا${
      duplicateCount > 0 ? ` (تم تجاوز ${duplicateCount} إشارة مكررة/مستوردة من قبل)` : ""
    }${firstInsertError ? ` — ⚠️ خطأ فقاعدة البيانات: ${firstInsertError}` : ""}.`,
    totalRows: rawRows.length,
    rawInsertedCount,
    relevantCount,
    digitalWatchCreatedCount,
    duplicateCount,
    error: firstInsertError,
  };
}
