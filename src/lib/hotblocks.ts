import type { createClient } from "@/lib/supabase/server";
import { getCoverageData } from "@/lib/coverage";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

export type Commune = { id: string; name: string; type: string };

export type CommuneHotBlock = {
  commune: Commune;
  voterCount: number;
  fieldCoveragePct: number | null;
  electionDayCoveragePct: number | null;
  priorityScore: number; // 0-100، الأعلى = أولوية أكبر
};

export type StationHotBlock = {
  id: string;
  centerName: string;
  subOfficeNumber: number | null;
  voterCount: number;
  hasConfirmedObserver: boolean;
};

/**
 * نظام "الكتل الساخنة" (طلب علي، 12 شتنبر 2026 — نسخة مبسّطة من التطبيق
 * المرجعي tetouan2026). التطبيق المرجعي كيحسب الحرارة بمطابقة عنوان كل
 * ناخب مع عنوان متطوع/مناضل قريب منو (5 درجات دقة). rassd-tetouan ما
 * فيهاش هاد المطابقة الدقيقة (قاعدة الناخبين مستوردة بخصوصية: أسماء
 * مختصرة + جماعة/مكتب تصويت فقط، بلا عنوان كامل — راجع
 * supabase/import_voters.sql).
 *
 * البديل هنا: "درجة أولوية" لكل جماعة = مزيج من (أ) كثافة الناخبين
 * (كل ما كان عدد الناخبين كبير، كل ما زادت الفرصة/الأهمية) و(ب) ضعف
 * تغطيتنا الحالية يوم الاقتراع (observers مؤكدين). جماعة بزاف ناخبين +
 * تغطية ضعيفة = أولوية عالية (خطر وفرصة فنفس الوقت). الصيغة:
 *   priorityScore = 0.5×(ترتيب الناخبين المئوي) + 0.5×(100 − نسبة التغطية)
 */
export async function getHotBlocksData(supabase: SupabaseClient) {
  const [communesRes, voterCountsRes, coverage] = await Promise.all([
    supabase.from("communes").select("id, name, type").order("name"),
    supabase.from("voters_by_commune").select("commune_id, voter_count"),
    getCoverageData(supabase),
  ]);
  const { data: communesRaw } = communesRes;
  const { data: voterCountsRaw, error: voterCountsError } = voterCountsRes;
  if (voterCountsError) {
    console.error("[hotblocks] voters_by_commune query failed:", JSON.stringify(voterCountsError));
  } else {
    console.error("[hotblocks] voters_by_commune rows:", (voterCountsRaw ?? []).length);
  }

  const communes = (communesRaw ?? []) as Commune[];
  const voterCounts = new Map((voterCountsRaw ?? []).map((r) => [r.commune_id as string, r.voter_count as number]));

  const maxVoters = Math.max(1, ...communes.map((c) => voterCounts.get(c.id) ?? 0));

  const rows: CommuneHotBlock[] = communes.map((c) => {
    const voterCount = voterCounts.get(c.id) ?? 0;
    const cov = coverage.byCommune.get(c.id);
    const electionDayCoveragePct = cov?.electionDayCoveragePct ?? null;
    const fieldCoveragePct = cov?.fieldCoveragePct ?? null;
    const voterRank = (voterCount / maxVoters) * 100;
    const coverageGap = 100 - (electionDayCoveragePct ?? 0);
    const priorityScore = Math.round(voterRank * 0.5 + coverageGap * 0.5);
    return { commune: c, voterCount, fieldCoveragePct, electionDayCoveragePct, priorityScore };
  });

  rows.sort((a, b) => b.priorityScore - a.priorityScore || b.voterCount - a.voterCount);

  const totalVoters = rows.reduce((sum, r) => sum + r.voterCount, 0);
  return { rows, totalVoters };
}

export async function getStationHotBlocks(supabase: SupabaseClient, communeId: string) {
  const [{ data: stationsRaw }, { data: countsRaw }, { data: observersRaw }] = await Promise.all([
    supabase
      .from("polling_stations")
      .select("id, center_name, sub_office_number")
      .eq("commune_id", communeId)
      .eq("is_mock", false),
    supabase.from("voters_by_polling_station").select("polling_station_id, voter_count"),
    supabase.from("observers").select("polling_station_id, confirmation_status"),
  ]);

  const counts = new Map((countsRaw ?? []).map((r) => [r.polling_station_id as string, r.voter_count as number]));
  const confirmedStations = new Set(
    (observersRaw ?? [])
      .filter((o) => o.confirmation_status === "مؤكد" && o.polling_station_id)
      .map((o) => o.polling_station_id as string)
  );

  const stations: StationHotBlock[] = (stationsRaw ?? []).map((s) => ({
    id: s.id,
    centerName: s.center_name,
    subOfficeNumber: s.sub_office_number,
    voterCount: counts.get(s.id) ?? 0,
    hasConfirmedObserver: confirmedStations.has(s.id),
  }));

  stations.sort((a, b) => b.voterCount - a.voterCount);
  return stations;
}
