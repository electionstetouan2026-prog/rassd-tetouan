import type { createClient } from "@/lib/supabase/server";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

export type Commune = { id: string; name: string; type: string };

export const STATUS_OPTIONS = [
  { value: "contacted", label: "تم التواصل", color: "var(--brand-blue)" },
  { value: "supporter", label: "مؤيد", color: "var(--severity-neutral)" },
  { value: "undecided", label: "متردد", color: "var(--severity-medium)" },
  { value: "opponent", label: "معارض", color: "var(--severity-high)" },
  { value: "unreachable", label: "تعذر الوصول", color: "#9ca3af" },
] as const;

export type ContactStatusValue = (typeof STATUS_OPTIONS)[number]["value"];

export function statusMeta(status: string | null) {
  return STATUS_OPTIONS.find((s) => s.value === status) ?? null;
}

// voter_contact_status جدول صغير (فقط الناخبين اللي تواصلنا معاهم فعلا،
// ماشي كل 269,749) لكن نجيبو بيه بصفحات احتياطا لحد db-max-rows
// الافتراضي لـSupabase (1000 صف/طلب) — نفس الدرس المسجل فـT-077.
async function fetchAllContactRows(supabase: SupabaseClient, filterCommuneId?: string) {
  const pageSize = 1000;
  const all: { commune_id: string | null; polling_station_id: string | null; status: string }[] = [];
  let from = 0;
  for (;;) {
    let q = supabase
      .from("voter_contact_status")
      .select("commune_id, polling_station_id, status")
      .range(from, from + pageSize - 1);
    if (filterCommuneId) q = q.eq("commune_id", filterCommuneId);
    const { data, error } = await q;
    if (error || !data) break;
    all.push(...(data as any[]));
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return all;
}

export type CommuneContactSummary = {
  commune: Commune;
  totalVoters: number;
  contactedCount: number;
  supporterCount: number;
};

export async function getCommuneContactSummary(supabase: SupabaseClient) {
  const [{ data: communesRaw }, { data: voterCountsRaw }, contactRows] = await Promise.all([
    supabase.from("communes").select("id, name, type").order("name"),
    supabase.from("voters_by_commune").select("commune_id, voter_count"),
    fetchAllContactRows(supabase),
  ]);

  const communes = (communesRaw ?? []) as Commune[];
  const voterCounts = new Map((voterCountsRaw ?? []).map((r) => [r.commune_id as string, r.voter_count as number]));

  const byCommune = new Map<string, { contacted: number; supporter: number }>();
  for (const row of contactRows) {
    if (!row.commune_id) continue;
    const cur = byCommune.get(row.commune_id) ?? { contacted: 0, supporter: 0 };
    cur.contacted += 1;
    if (row.status === "supporter") cur.supporter += 1;
    byCommune.set(row.commune_id, cur);
  }

  const rows: CommuneContactSummary[] = communes.map((c) => ({
    commune: c,
    totalVoters: voterCounts.get(c.id) ?? 0,
    contactedCount: byCommune.get(c.id)?.contacted ?? 0,
    supporterCount: byCommune.get(c.id)?.supporter ?? 0,
  }));

  const totals = rows.reduce(
    (acc, r) => ({
      totalVoters: acc.totalVoters + r.totalVoters,
      contactedCount: acc.contactedCount + r.contactedCount,
      supporterCount: acc.supporterCount + r.supporterCount,
    }),
    { totalVoters: 0, contactedCount: 0, supporterCount: 0 }
  );

  return { rows, totals };
}

export type StationContactSummary = {
  id: string;
  centerName: string;
  subOfficeNumber: number | null;
  totalVoters: number;
  contactedCount: number;
};

export async function getStationContactSummary(supabase: SupabaseClient, communeId: string) {
  const [{ data: stationsRaw }, { data: countsRaw }, contactRows] = await Promise.all([
    supabase
      .from("polling_stations")
      .select("id, center_name, sub_office_number")
      .eq("commune_id", communeId)
      .eq("is_mock", false),
    supabase.from("voters_by_polling_station").select("polling_station_id, voter_count"),
    fetchAllContactRows(supabase, communeId),
  ]);

  const counts = new Map((countsRaw ?? []).map((r) => [r.polling_station_id as string, r.voter_count as number]));
  const contactedByStation = new Map<string, number>();
  for (const row of contactRows) {
    if (!row.polling_station_id) continue;
    contactedByStation.set(row.polling_station_id, (contactedByStation.get(row.polling_station_id) ?? 0) + 1);
  }

  const stations: StationContactSummary[] = (stationsRaw ?? []).map((s) => ({
    id: s.id,
    centerName: s.center_name,
    subOfficeNumber: s.sub_office_number,
    totalVoters: counts.get(s.id) ?? 0,
    contactedCount: contactedByStation.get(s.id) ?? 0,
  }));

  stations.sort((a, b) => b.totalVoters - a.totalVoters);
  return stations;
}

export type VoterRow = {
  id: number;
  initials: string;
  status: string | null;
  channel: string | null;
  notes: string | null;
};

const PAGE_SIZE = 50;

export async function getStationVoters(
  supabase: SupabaseClient,
  stationId: string,
  statusFilter: string,
  page: number
) {
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  if (statusFilter === "all") {
    const { data: votersRaw, count } = await supabase
      .from("voters")
      .select("id, initials", { count: "exact" })
      .eq("polling_station_id", stationId)
      .order("id")
      .range(from, to);
    const ids = (votersRaw ?? []).map((v) => v.id);
    const { data: statusRaw } = ids.length
      ? await supabase.from("voter_contact_status").select("voter_id, status, channel, notes").in("voter_id", ids)
      : { data: [] as any[] };
    const statusMap = new Map((statusRaw ?? []).map((s) => [s.voter_id as number, s]));
    const rows: VoterRow[] = (votersRaw ?? []).map((v) => {
      const s = statusMap.get(v.id);
      return { id: v.id, initials: v.initials, status: s?.status ?? null, channel: s?.channel ?? null, notes: s?.notes ?? null };
    });
    return { rows, total: count ?? 0 };
  }

  if (statusFilter === "not_contacted") {
    // نجيبو الناخبين المتواصل معاهم فهاد المكتب (عادة عدد محدود) باش نستثنيهم
    const { data: contactedRaw } = await supabase
      .from("voter_contact_status")
      .select("voter_id")
      .eq("polling_station_id", stationId);
    const contactedIds = (contactedRaw ?? []).map((r) => r.voter_id as number);

    let q = supabase
      .from("voters")
      .select("id, initials", { count: "exact" })
      .eq("polling_station_id", stationId)
      .order("id")
      .range(from, to);
    if (contactedIds.length > 0) q = q.not("id", "in", `(${contactedIds.join(",")})`);
    const { data: votersRaw, count } = await q;
    const rows: VoterRow[] = (votersRaw ?? []).map((v) => ({ id: v.id, initials: v.initials, status: null, channel: null, notes: null }));
    return { rows, total: count ?? 0 };
  }

  // فلترة بحالة محددة (مؤيد/متردد/معارض/إلخ)
  const { data: matchingRaw, count } = await supabase
    .from("voter_contact_status")
    .select("voter_id, status, channel, notes", { count: "exact" })
    .eq("polling_station_id", stationId)
    .eq("status", statusFilter)
    .order("voter_id")
    .range(from, to);

  const ids = (matchingRaw ?? []).map((r) => r.voter_id as number);
  const { data: votersRaw } = ids.length
    ? await supabase.from("voters").select("id, initials").in("id", ids)
    : { data: [] as any[] };
  const initialsMap = new Map((votersRaw ?? []).map((v) => [v.id as number, v.initials as string]));
  const rows: VoterRow[] = (matchingRaw ?? []).map((r) => ({
    id: r.voter_id,
    initials: initialsMap.get(r.voter_id) ?? "—",
    status: r.status,
    channel: r.channel,
    notes: r.notes,
  }));
  return { rows, total: count ?? 0 };
}

export const VOTER_CONTACT_PAGE_SIZE = PAGE_SIZE;
