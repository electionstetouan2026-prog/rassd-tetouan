import type { createClient } from "@/lib/supabase/server";
import { OUR_CANDIDATE_KEY, ALL_ENTITY_NAMES } from "./polibrandEntities";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

export type EntityDigitalStats = {
  name: string;
  isUs: boolean;
  currentCount: number;
  previousCount: number;
  sentimentCounts: Record<string, number>;
  trend: "up" | "down" | "flat" | null;
};

export type DigitalRankingData = {
  windowDays: number;
  sinceDate: string;
  hasData: boolean;
  ranked: EntityDigitalStats[];
};

/**
 * الترتيب التنافسي الرقمي: من كيهيمن على الفضاء الرقمي (حجم/شعور
 * الإشارات المستوردة من بوليبراند) — نحن مقابل كل منافس مسمّى، على
 * مستوى الدائرة كاملة (ماشي بالجماعة، بخلاف getRankingData فـ
 * ranking.ts اللي كيرتب حسب الحضور الميداني بالجماعة). "تقدير اجتهادي
 * مبني على حجم التغطية الإعلامية المرصودة، ماشي استطلاع رأي علمي" —
 * راجع claude/POLIBRAND_INTEGRATION_PLAN.md القسم 4.
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

  const { data: rows } = await supabase
    .from("polibrand_mentions")
    .select("entry_date, matched_entities, menace")
    .not("matched_entities", "is", null)
    .gte("entry_date", prevSinceDate);

  const stats = new Map<string, EntityDigitalStats>(
    ALL_ENTITY_NAMES.map((name) => [
      name,
      {
        name,
        isUs: name === OUR_CANDIDATE_KEY,
        currentCount: 0,
        previousCount: 0,
        sentimentCounts: { "إيجابي": 0, "محايد": 0, "سلبي": 0 },
        trend: null,
      },
    ])
  );

  for (const row of rows ?? []) {
    const entities = String(row.matched_entities ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (entities.length === 0) continue;
    const isCurrentWindow = String(row.entry_date) >= sinceDate;
    const sentiment = row.menace ? "سلبي" : "محايد";
    for (const name of entities) {
      const s = stats.get(name);
      if (!s) continue; // كيان غير معروف فاللائحة (نظريا ما يقعش)
      if (isCurrentWindow) {
        s.currentCount++;
        s.sentimentCounts[sentiment] = (s.sentimentCounts[sentiment] ?? 0) + 1;
      } else {
        s.previousCount++;
      }
    }
  }

  const ranked = Array.from(stats.values())
    .filter((s) => s.currentCount + s.previousCount > 0)
    .map((s) => ({
      ...s,
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
    .sort((a, b) => b.currentCount - a.currentCount);

  return { windowDays, sinceDate, hasData: (rows ?? []).length > 0, ranked };
}
