import type { createClient } from "@/lib/supabase/server";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

export const OUR_PARTY_KEY = "زهير الركاني — PPS";

export type ElectionResultRow = {
  id: string;
  officeNumber: number;
  centerName: string;
  registeredVoters: number | null;
  votersCount: number | null;
  voidVotes: number | null;
  validVotes: number | null;
  partyVotes: Record<string, number>;
  totalLists: number | null;
  diffCheck: number | null;
  status: string | null;
  matchedStationIds: string[];
  matchedCommuneName: string | null;
  observerCount: number;
  hasCoverage: boolean;
};

export type ElectionSummaryRow = {
  id: string;
  listRank: number;
  listName: string;
  totalVotes: number;
  pctValid: number | null;
  linkStatus: string | null;
  note: string | null;
  isOurList: boolean;
};

/**
 * تطبيع اسم المركز للمطابقة بين "بيان المكتب" (ملف النتائج التقديري)
 * و center_name فـpolling_stations — الاختلافات المتوقعة: أشكال الألف/الياء/التاء
 * المربوطة، ومسافات زائدة. ماشي مطابقة دلالية (لا نحاول تخمين الأسماء
 * المختلفة كليا)، غير تطبيع إملائي بسيط.
 */
function normalizeCenterName(s: string) {
  return s
    .replace(/[إأآا]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * نتائج اللائحة المحلية (تقديرية، طلب علي 25 شتنبر 2026) — مبنية من
 * election_results/election_results_summary (راجع supabase/add_election_results.sql)
 * مربوطة حيا بـpolling_stations/observers الحقيقيين فمنصتنا. الربط بالاسم
 * (بيان المكتب ↔ center_name) يتم هنا وقت القراءة — ماشي وقت الاستيراد —
 * باش أي تعديل لاحق فـpolling_stations (اسم/إضافة مكتب فرعي) ينعكس مباشرة
 * بلا حاجة لإعادة استيراد بيانات النتائج.
 */
export async function getElectionResultsData(supabase: SupabaseClient) {
  const [{ data: resultsRaw }, { data: summaryRaw }, { data: stationsRaw }, { data: observersRaw }] =
    await Promise.all([
      supabase.from("election_results").select("*").order("office_number"),
      supabase.from("election_results_summary").select("*").order("list_rank"),
      supabase
        .from("polling_stations")
        .select("id, center_name, commune_id, communes(name)")
        .eq("is_mock", false),
      supabase.from("observers").select("id, polling_station_id"),
    ]);

  const stations = (stationsRaw ?? []) as any[];
  const observers = (observersRaw ?? []) as any[];

  // تجميع مكاتب التصويت الفرعية حسب اسم المركز المطبّع (مدرسة/ثانوية واحدة
  // = عدة مكاتب فرعية فمنصتنا، لكن مكتب مركزي واحد فملف النتائج)
  const stationsByCenter = new Map<string, { ids: string[]; communeName: string | null }>();
  for (const s of stations) {
    const key = normalizeCenterName(s.center_name as string);
    const entry = stationsByCenter.get(key) ?? {
      ids: [] as string[],
      communeName: (s.communes as any)?.name ?? null,
    };
    entry.ids.push(s.id as string);
    stationsByCenter.set(key, entry);
  }

  const observerCountByStation = new Map<string, number>();
  for (const o of observers) {
    if (!o.polling_station_id) continue;
    const id = o.polling_station_id as string;
    observerCountByStation.set(id, (observerCountByStation.get(id) ?? 0) + 1);
  }

  const results: ElectionResultRow[] = (resultsRaw ?? []).map((r: any) => {
    const key = normalizeCenterName(r.center_name as string);
    const match = stationsByCenter.get(key);
    const matchedStationIds = match?.ids ?? [];
    const observerCount = matchedStationIds.reduce(
      (sum, id) => sum + (observerCountByStation.get(id) ?? 0),
      0
    );
    return {
      id: r.id as string,
      officeNumber: r.office_number as number,
      centerName: r.center_name as string,
      registeredVoters: r.registered_voters,
      votersCount: r.voters_count,
      voidVotes: r.void_votes,
      validVotes: r.valid_votes,
      partyVotes: (r.party_votes ?? {}) as Record<string, number>,
      totalLists: r.total_lists,
      diffCheck: r.diff_check,
      status: r.status,
      matchedStationIds,
      matchedCommuneName: match?.communeName ?? null,
      observerCount,
      hasCoverage: observerCount > 0,
    };
  });

  const summary: ElectionSummaryRow[] = (summaryRaw ?? []).map((s: any) => ({
    id: s.id as string,
    listRank: s.list_rank as number,
    listName: s.list_name as string,
    totalVotes: s.total_votes as number,
    pctValid: s.pct_valid,
    linkStatus: s.link_status,
    note: s.note,
    isOurList: !!s.is_our_list,
  }));

  const totals = results.reduce(
    (acc, r) => {
      acc.registered += r.registeredVoters ?? 0;
      acc.voters += r.votersCount ?? 0;
      acc.void += r.voidVotes ?? 0;
      acc.valid += r.validVotes ?? 0;
      return acc;
    },
    { registered: 0, voters: 0, void: 0, valid: 0 }
  );

  const coveredOfficesCount = results.filter((r) => r.hasCoverage).length;
  const unmatchedOffices = results.filter((r) => r.matchedStationIds.length === 0);
  const partyKeys = results[0] ? Object.keys(results[0].partyVotes) : [];

  return {
    results,
    summary,
    totals,
    coveredOfficesCount,
    unmatchedOffices,
    partyKeys,
  };
}
