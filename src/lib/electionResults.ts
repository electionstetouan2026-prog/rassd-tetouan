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
  subOffices: SubOfficeElectionRow[];
};

export type SubOfficeElectionRow = {
  id: string;
  officeNumber: number | null;
  officeNumberRaw: string | null;
  partyVotes: Record<string, number>;
  totalVotes: number | null;
  matchedStationId: string | null;
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

export type LocalListOfficialRow = {
  id: string;
  candidateRank: number;
  candidateName: string;
  votes: number;
  seatsWon: number;
  isOurCandidate: boolean;
  approxReading: boolean;
};

// سياق الدائرة كما ورد فمحضر النتيجة الرسمية للائحة المحلية
// (S55C-6e26092416210.pdf، ص 1-2) — 23 شتنبر 2026.
export const LOCAL_LIST_DISTRICT_CONTEXT = {
  registeredVoters: 268994,
  electoralQuotient: 53798,
  seatsAvailable: 5,
};

/**
 * النتيجة الرسمية النهائية للائحة المحلية (ماشي تقدير) — من محضر لجنة
 * الإحصاء المكلفة بإحصاء الأصوات وإعلان نتائج الاقتراع لـ"الدائرة
 * الانتخابية المحلية: تطوان" (راجع supabase/add_local_list_official_result.sql).
 * هاد الجدول فيه فقط مجموع الأصوات على مستوى الدائرة لكل لائحة من
 * الـ17 لائحة (بلا تفصيل مكتب-بمكتب)، بعكس election_results اللي
 * كيبقى تقدير تحليلي مبني على اللائحة الجهوية.
 */
export async function getLocalListOfficialResult(supabase: SupabaseClient) {
  const { data } = await supabase
    .from("local_list_official_result")
    .select("*")
    .order("candidate_rank");

  const rows: LocalListOfficialRow[] = (data ?? []).map((r: any) => ({
    id: r.id as string,
    candidateRank: r.candidate_rank as number,
    candidateName: r.candidate_name as string,
    votes: r.votes as number,
    seatsWon: r.seats_won as number,
    isOurCandidate: !!r.is_our_candidate,
    approxReading: !!r.approx_reading,
  }));

  const ourRow = rows.find((r) => r.isOurCandidate) ?? null;
  const sortedByVotes = [...rows].sort((a, b) => b.votes - a.votes);
  const ourVoteRank = ourRow ? sortedByVotes.findIndex((r) => r.id === ourRow.id) + 1 : null;

  return { rows, ourRow, ourVoteRank, totalCandidates: rows.length };
}

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
  const [
    { data: resultsRaw },
    { data: summaryRaw },
    { data: stationsRaw },
    { data: observersRaw },
    { data: subOfficesRaw },
  ] = await Promise.all([
    supabase.from("election_results").select("*").order("office_number"),
    supabase.from("election_results_summary").select("*").order("list_rank"),
    supabase
      .from("polling_stations")
      .select("id, center_name, commune_id, sub_office_number, communes(name)")
      .eq("is_mock", false),
    supabase.from("observers").select("id, polling_station_id"),
    supabase
      .from("sub_office_election_results")
      .select("*")
      .order("office_number"),
  ]);

  const stations = (stationsRaw ?? []) as any[];
  const observers = (observersRaw ?? []) as any[];
  const subOfficeRows = (subOfficesRaw ?? []) as any[];

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

  // ربط تفصيل المكاتب الفرعية (sub_office_election_results، محاضر حقيقية)
  // بمكاتب التصويت عبر (اسم الجماعة، رقم المكتب الفرعي) — مطابقة دقيقة
  // بالرقم، ماشي بالاسم، بعكس مطابقة المكتب المركزي أعلاه.
  const stationBySubOffice = new Map<string, { id: string; centerName: string }>();
  for (const s of stations) {
    const communeName = (s.communes as any)?.name ?? null;
    const subOfficeNumber = s.sub_office_number as number | null;
    if (!communeName || subOfficeNumber == null) continue;
    stationBySubOffice.set(`${communeName}__${subOfficeNumber}`, {
      id: s.id as string,
      centerName: s.center_name as string,
    });
  }

  const subOfficesByCenterKey = new Map<string, SubOfficeElectionRow[]>();
  const unattributedSubOffices: SubOfficeElectionRow[] = [];
  for (const so of subOfficeRows) {
    const officeNumber = so.office_number as number | null;
    const match =
      officeNumber != null ? stationBySubOffice.get(`${so.commune_name}__${officeNumber}`) : undefined;
    const observerCount = match ? observerCountByStation.get(match.id) ?? 0 : 0;
    const row: SubOfficeElectionRow = {
      id: so.id as string,
      officeNumber,
      officeNumberRaw: so.office_number_raw ?? (officeNumber != null ? String(officeNumber) : null),
      partyVotes: (so.party_votes ?? {}) as Record<string, number>,
      totalVotes: so.total_votes,
      matchedStationId: match?.id ?? null,
      observerCount,
      hasCoverage: observerCount > 0,
    };
    if (match) {
      const key = normalizeCenterName(match.centerName);
      const list = subOfficesByCenterKey.get(key) ?? [];
      list.push(row);
      subOfficesByCenterKey.set(key, list);
    } else {
      unattributedSubOffices.push(row);
    }
  }
  for (const list of subOfficesByCenterKey.values()) {
    list.sort((a, b) => (a.officeNumber ?? 0) - (b.officeNumber ?? 0));
  }
  const subOfficePartyKeys = subOfficeRows[0] ? Object.keys(subOfficeRows[0].party_votes ?? {}) : [];

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
      subOffices: subOfficesByCenterKey.get(key) ?? [],
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
    unattributedSubOffices,
    subOfficePartyKeys,
  };
}
