import type { createClient } from "@/lib/supabase/server";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

// ============================================================
// "السياق الانتخابي" — نسخة مبسّطة (T-078، آخر مهمة قبل محرك
// الاستيراد العام). النسخة الأصلية فالتطبيق المرجعي (/electoral-districts)
// كتعرض: مقاعد حزب التقدم والاشتراكية 2015/2021 لكل جماعة، مسار
// تشريعي كامل للحزب بالدائرة (نتائج 2007-2021: أصوات/نسبة/وكيل
// اللائحة)، ولائحتي منتخبين حاليين/تاريخيين (جدول Candidate).
//
// **قيد بيانات صادق**: لا توجد فrassd-tetouan أي بيانات عن مقاعد
// حزب التقدم والاشتراكية تحديدا (لا على مستوى الجماعة ولا الدائرة) —
// `seed_communes_2021_baseline.sql` فيه فقط "الحزب المتصدر" لكل جماعة
// (وحزب التقدم والاشتراكية لم يتصدر أي جماعة سنة 2021، نفس الاكتشاف
// المسجل فT-078/stronghold-map)، ولا يوجد مسار تشريعي تاريخي مسجل.
// **البديل**: عرض خط الأساس 2021 الحقيقي الموجود (تصدر عام + نسبته +
// المشاركة) + أعداد ناخبينا الحقيقية (مستوردة T-076) لكل جماعة، وجدول
// جديد بسيط (`party_officials`) يملأه علي يدويا بأسماء مسؤولي/مرشحي
// الحزب (شخصيات عمومية، ماشي بيانات ناخبين) بدل استيراد جدول Candidate
// كامل غير موجود عندنا.
// ============================================================

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
