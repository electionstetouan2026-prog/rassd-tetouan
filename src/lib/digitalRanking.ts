import type { createClient } from "@/lib/supabase/server";
import { OUR_CANDIDATE_KEY, ALL_ENTITY_NAMES } from "./polibrandEntities";
import { getCandidatesMap } from "./candidates";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

// وزن افتراضي (0-100) للإشارات اللي مازال ما دارلهاش تحليل AI بعد —
// معتدل عمدا، باش لا يطغى على الإشارات المحلَّلة فعليا ولا يهمّشها
const UNANALYZED_BASELINE_INFLUENCE = 15;

// أقل عدد إشارات باش اسم جديد (مكتشف بالـAI، ماشي فاللائحة المعروفة
// سلفا) يبان فالترتيب — تفاديا لظهور أسماء عابرة (صحافي، مسؤول محلي
// غير سياسي...) بمجرد ذكر واحد
const NEW_ENTITY_MIN_MENTIONS = 3;

export type EntityDigitalStats = {
  name: string;
  isUs: boolean;
  isNewlyDiscovered: boolean;
  currentCount: number;
  previousCount: number;
  analyzedCount: number;
  estimatedInfluence: number;
  sentimentCounts: Record<string, number>;
  trend: "up" | "down" | "flat" | null;
  // "الوزن السياسي البنيوي" — من جدول candidates (منصب/تاريخ انتخابي/
  // حزب)، مستقل كليا على بوليبراند. null = اسم مكتشف تلقائيا بعد
  // مازال ما تزادش لجدول candidates (راجع src/lib/candidates.ts)
  baselineStrength: number | null;
  party: string | null;
  currentPosition: string | null;
};

export type DigitalRankingData = {
  windowDays: number;
  sinceDate: string;
  hasData: boolean;
  analyzedShare: number; // 0-1، نسبة الإشارات (فالنافذة الحالية) اللي دار عليها تحليل AI فعليا
  ranked: EntityDigitalStats[];
};

/**
 * الترتيب التنافسي الرقمي: من كيهيمن على الفضاء الرقمي — نحن مقابل
 * كل منافس، على مستوى الدائرة كاملة (ماشي بالجماعة، بخلاف
 * getRankingData فـ ranking.ts). كيدمج مصدرين للكيانات: matched_entities
 * (مطابقة نصية بلائحة معروفة سلفا) و ai_entities (قراءة مفتوحة بالذكاء
 * الاصطناعي كتكتشف منافسين ماكناش نتوقعوهم — راجع mentionAnalysis.ts)
 * — الاتحاد بينهم، ماشي واحد بدل الآخر. الترتيب مبني على "تأثير مقدَّر"
 * (مجموع ai_influence_score للإشارات المحلَّلة + وزن افتراضي معتدل
 * للي مازال ما تحللاتش) بدل مجرد عدد الإشارات الخام — طلب علي 17
 * شتنبر 2026. "تقدير اجتهادي، ماشي استطلاع رأي علمي".
 */
export async function getDigitalCompetitiveRanking(
  supabase: SupabaseClient,
  windowDays = 14
): Promise<DigitalRankingData> {
  const now = new Date();
  const since = new Date(now);
  since.setDate(since.getDate() - windowDays);
  const sinceDate = since.toISOString().slice(0, 10);
  const prevSince = new Date(now);
  prevSince.setDate(prevSince.getDate() - windowDays * 2);
  const prevSinceDate = prevSince.toISOString().slice(0, 10);

  const [{ data: rows }, candidatesMap] = await Promise.all([
    supabase
      .from("polibrand_mentions")
      .select("entry_date, matched_entities, ai_entities, ai_influence_score, ai_analyzed_at, menace")
      .gte("entry_date", prevSinceDate)
      .or("matched_entities.not.is.null,ai_entities.not.is.null"),
    getCandidatesMap(supabase),
  ]);

  type Stat = EntityDigitalStats & { _mentionCount: number };
  const stats = new Map<string, Stat>(
    ALL_ENTITY_NAMES.map((name) => {
      const profile = candidatesMap.get(name);
      return [
        name,
        {
          name,
          isUs: name === OUR_CANDIDATE_KEY,
          isNewlyDiscovered: false,
          currentCount: 0,
          previousCount: 0,
          analyzedCount: 0,
          estimatedInfluence: 0,
          sentimentCounts: { "إيجابي": 0, "محايد": 0, "سلبي": 0 },
          trend: null,
          baselineStrength: profile?.baselineStrength ?? null,
          party: profile?.party ?? null,
          currentPosition: profile?.currentPosition ?? null,
          _mentionCount: 0,
        },
      ];
    })
  );

  function getOrCreate(name: string): Stat {
    let s = stats.get(name);
    if (!s) {
      const profile = candidatesMap.get(name);
      s = {
        name,
        isUs: false,
        isNewlyDiscovered: true,
        currentCount: 0,
        previousCount: 0,
        analyzedCount: 0,
        estimatedInfluence: 0,
        sentimentCounts: { "إيجابي": 0, "محايد": 0, "سلبي": 0 },
        trend: null,
        baselineStrength: profile?.baselineStrength ?? null,
        party: profile?.party ?? null,
        currentPosition: profile?.currentPosition ?? null,
        _mentionCount: 0,
      };
      stats.set(name, s);
    }
    return s;
  }

  let analyzedRowsInWindow = 0;
  let totalRowsInWindow = 0;

  for (const row of rows ?? []) {
    const matched = String(row.matched_entities ?? "").split(",").map((s) => s.trim()).filter(Boolean);
    const aiFound = String(row.ai_entities ?? "").split(",").map((s) => s.trim()).filter(Boolean);
    const entities = Array.from(new Set([...matched, ...aiFound]));
    if (entities.length === 0) continue;

    const isCurrentWindow = String(row.entry_date) >= sinceDate;
    const sentiment = row.menace ? "سلبي" : "محايد";
    const isAnalyzed = row.ai_analyzed_at != null && row.ai_influence_score != null;
    const influence = isAnalyzed ? Number(row.ai_influence_score) : UNANALYZED_BASELINE_INFLUENCE;

    if (isCurrentWindow) {
      totalRowsInWindow++;
      if (isAnalyzed) analyzedRowsInWindow++;
    }

    for (const name of entities) {
      const s = getOrCreate(name);
      s._mentionCount++;
      if (isCurrentWindow) {
        s.currentCount++;
        s.estimatedInfluence += influence;
        if (isAnalyzed) s.analyzedCount++;
        s.sentimentCounts[sentiment] = (s.sentimentCounts[sentiment] ?? 0) + 1;
      } else {
        s.previousCount++;
      }
    }
  }

  const ranked = Array.from(stats.values())
    .filter((s) => s.currentCount + s.previousCount > 0)
    // اسم جديد (ماشي فاللائحة المعروفة) لازم يوصل لحد أدنى من الإشارات
    // (فالنافذتين مجموعين) قبل ما يبان، تفاديا للضجيج
    .filter((s) => !s.isNewlyDiscovered || s._mentionCount >= NEW_ENTITY_MIN_MENTIONS)
    .map(({ _mentionCount, ...s }) => ({
      ...s,
      estimatedInfluence: Math.round(s.estimatedInfluence),
      trend:
        s.previousCount === 0
          ? s.currentCount > 0
            ? ("up" as const)
            : null
          : s.currentCount > s.previousCount
          ? ("up" as const)
          : s.currentCount < s.previousCount
          ? ("down" as const)
          : ("flat" as const),
    }))
    .sort((a, b) => b.estimatedInfluence - a.estimatedInfluence || b.currentCount - a.currentCount);

  return {
    windowDays,
    sinceDate,
    hasData: (rows ?? []).length > 0,
    analyzedShare: totalRowsInWindow > 0 ? analyzedRowsInWindow / totalRowsInWindow : 0,
    ranked,
  };
}
