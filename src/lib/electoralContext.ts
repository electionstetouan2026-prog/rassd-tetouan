import type { createClient } from "@/lib/supabase/server";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

// ============================================================
// "السياق الانتخابي" — تحديث (13 شتنبر 2026): علي أكّد عبر سكرينشوت
// مباشر من التطبيق المرجعي (`/electoral-districts`) أن الملف الحزبي
// التاريخي لحزب التقدم والاشتراكية بدائرة تطوان بيانات حقيقية
// وموثّقة (وليست مفقودة كما افترضنا أول مرة) — لكنها مخزّنة فقاعدة
// سحابية منفصلة تماما (Supabase الخاص بـtetouan2026 نفسه، عبر
// `CLOUD_DATABASE_URL`) ماعندناش وصول ليها من هاد الجهاز (نفس القيد
// المسجل فT-073). المصدر الأصلي: ملف `نتائج_الانتخابات_السابقة.html`
// (بحث فعلي فالكود أكّد عدم وجوده على هاد الآيماك).
//
// **الحل المعتمد**: الأرقام التاريخية الثابتة (لن تتغير — انتخابات
// ماضية) تُنسخ حرفيا من السكرينشوت المؤكد من علي، وتُخزَّن هنا كثابت
// مصدره موثّق (نفس أسلوب `DISTRICT_CONTEXT` فالتطبيق المرجعي نفسو
// للمعطيات غير القابلة للتغيير). الأسماء (منتخبون/مرشحون) تُدخل عبر
// جدول `party_officials` الموجود أصلا (قابل للتعديل من علي فالواجهة).
// ============================================================

export const PPS_NAME = "حزب التقدم والاشتراكية";

export const PPS_DISTRICT_FILE = {
  candidate2026: "زهير الركاني",
  candidate2026Note:
    "التزكية التشريعية مسجلة محليا ومؤكدة في أبريل 2026 (تأكيد صحفي مباشر).",
  candidate2026SourceUrl:
    "https://presstetouan.com/%D8%B2%D9%87%D9%8A%D8%B1-%D8%A7%D9%84%D8%B1%D9%83%D8%A7%D9%86%D9%8A-%D9%8A%D9%82%D9%88%D8%AF-%D9%84%D8%A7%D8%A6%D8%AD%D8%A9-%D8%AD%D8%B2%D8%A8-%D8%A7%D9%84%D8%AA%D9%82%D8%AF%D9%85-%D9%88%D8%A7%D9%84/",
  communalSeats2015: 102,
  communalSeats2015Communes: 10,
  communalSeats2021: 4,
  communalSeats2021Communes: 1,
  bestLegislativeVotes: 13289,
  bestLegislativeYear: 2016,
  bestLegislativePercentage: 16.72,
  councilMembers2021Tetouan: 4,
};

export type PpsLegislativeResult = {
  year: number;
  seats: number;
  votes: number | null;
  percentage: number | null;
  agentName: string | null;
  participationRate: number | null;
};

export const PPS_LEGISLATIVE_HISTORY: PpsLegislativeResult[] = [
  { year: 2021, seats: 0, votes: null, percentage: 3, agentName: null, participationRate: 36 },
  { year: 2016, seats: 0, votes: 13289, percentage: 17, agentName: "محمد العربي أحنين", participationRate: 39 },
  { year: 2011, seats: 0, votes: 8763, percentage: null, agentName: "محمد العربي أحنين", participationRate: 38 },
];

export type Commune = {
  id: string;
  name: string;
  type: string;
  registered_voters_est: number | null;
  participation_rate_2021: number | null;
  seats_total_2021: number | null;
  districts_count_2021: number | null;
  total_votes_2021: number | null;
  leading_party_2021: string | null;
  leading_party_seats_2021: number | null;
  leading_party_pct_2021: number | null;
};

export type CommuneElectoralRow = {
  commune: Commune;
  realVoters: number;
};

export type PartyOfficial = {
  id: string;
  full_name: string;
  role: string | null;
  category: string;
  notes: string | null;
  commune: { id: string; name: string } | null;
};

export async function getElectoralContextData(supabase: SupabaseClient) {
  const [{ data: communesRaw }, { data: voterCountsRaw }, { count: totalStations }, { data: officialsRaw }] =
    await Promise.all([
      supabase
        .from("communes")
        .select(
          "id, name, type, registered_voters_est, participation_rate_2021, seats_total_2021, districts_count_2021, total_votes_2021, leading_party_2021, leading_party_seats_2021, leading_party_pct_2021"
        )
        .order("name"),
      supabase.from("voters_by_commune").select("commune_id, voter_count"),
      supabase.from("polling_stations").select("id", { count: "exact", head: true }).eq("is_mock", false),
      supabase
        .from("party_officials")
        .select("id, full_name, role, category, notes, commune:communes(id, name)")
        .order("category")
        .order("full_name"),
    ]);

  const communes = (communesRaw ?? []) as Commune[];
  const voterCounts = new Map((voterCountsRaw ?? []).map((r) => [r.commune_id as string, r.voter_count as number]));

  const communeRows: CommuneElectoralRow[] = communes.map((c) => ({
    commune: c,
    realVoters: voterCounts.get(c.id) ?? 0,
  }));

  const totalVoters = communeRows.reduce((sum, r) => sum + r.realVoters, 0);

  const officials = ((officialsRaw ?? []) as any[]).map((o) => ({
    id: o.id,
    full_name: o.full_name,
    role: o.role,
    category: o.category,
    notes: o.notes,
    commune: o.commune ?? null,
  })) as PartyOfficial[];

  return {
    communeRows,
    totalVoters,
    totalStations: totalStations ?? 0,
    totalCommunes: communes.length,
    officials,
  };
}
