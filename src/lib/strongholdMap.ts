import type { createClient } from "@/lib/supabase/server";
import { getCommuneContactSummary } from "@/lib/voterContact";
import { getCoverageData } from "@/lib/coverage";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

// ============================================================
// "الخريطة ومواطن القوة" — نسخة مبسّطة (T-078، طلب علي "كيفما هو"
// مع تبسيط جوهري).
//
// النسخة الأصلية فالتطبيق المرجعي (StrongholdScore) كتحسب 4 مؤشرات:
// خط الأساس التاريخي لحزب التقدم والاشتراكية (35%)، عناقيد عائلية
// عالية الثقة مبنية على مطابقة عناوين كاملة (30%)، النمو السكاني
// (20%)، ونسبة الثقة فجودة العناوين (15%).
//
// rassd-tetouan ما فيهاش عناوين كاملة ولا مطابقة عائلية (D-031 —
// جدول voters فيه غير الحروف الأولى + مكتب التصويت)، وقاعدة
// seed_communes_2021_baseline.sql (خط الأساس 2021) فيها غير "الحزب
// المتصدر" لكل جماعة — **حزب التقدم والاشتراكية ماكانش متصدر فأي
// وحدة من الـ22 جماعة سنة 2021**، يعني لا يمكن حساب حصة تاريخية
// حقيقية للحزب من هاد المصدر (مؤكد بفحص مباشر للملف، 13 شتنبر).
//
// **البديل المبسّط**: مؤشر "قوة ميدانية" مبني بالكامل من بيانات
// حملتنا الحية (ماشي تخمين): نسبة التأييد بين الناخبين المتواصل
// معهم (متابعة الفريق الميداني)، نسبة تغطية التواصل من إجمالي
// الناخبين، نسبة التغطية الميدانية بالخلايا (خريطة الحضور)، وكثافة
// الفريق الميداني (متطوعون + مناضلون). خط الأساس 2021 يُعرض كسياق
// تاريخي فقط (بلا وزن فالمؤشر)، بشفافية تامة حول حدوده.
// ============================================================

export type Commune = {
  id: string;
  name: string;
  type: string;
  registered_voters_est: number | null;
  leading_party_2021: string | null;
  leading_party_pct_2021: number | null;
};

export type StrongholdRow = {
  commune: Commune;
  totalVoters: number;
  contactedCount: number;
  supporterCount: number;
  contactCoveragePct: number | null;
  supportRatioPct: number | null;
  fieldCoveragePct: number | null;
  teamCount: number;
  teamDensityScore: number | null;
  compositeScore: number | null;
  dataComponents: number;
};

// كثافة الفريق: كل عضو (متطوع أو مناضل) نشيط فالجماعة كيضيف 20 نقطة
// (5 أعضاء = تغطية كاملة 100). سقف بسيط، ماشي مقياس علمي — قابل
// للتعديل مستقبلا إذا كبر حجم الفريق فعليا.
function teamScore(count: number): number {
  return Math.min(100, count * 20);
}

export async function getStrongholdMapData(supabase: SupabaseClient) {
  const [{ communes: communesRaw }, coverage, { data: volunteersRaw }, { data: activistsRaw }] =
    await Promise.all([
      getCommuneContactSummaryWithBaseline(supabase),
      getCoverageData(supabase),
      // فرق ميدانية عادة صغيرة العدد (عشرات لا آلاف) لحملة دائرة واحدة —
      // بلا حاجة لتصفح صفحات هنا (بعكس دروس T-077/T-078 مع جداول الناخبين).
      supabase.from("volunteers").select("commune_id").eq("status", "نشيط"),
      supabase.from("activists").select("commune_id").eq("status", "نشيط"),
    ]);

  const teamByCommune = new Map<string, number>();
  for (const row of [...(volunteersRaw ?? []), ...(activistsRaw ?? [])]) {
    const cid = (row as { commune_id: string | null }).commune_id;
    if (!cid) continue;
    teamByCommune.set(cid, (teamByCommune.get(cid) ?? 0) + 1);
  }

  const rows: StrongholdRow[] = communesRaw.map((c) => {
    const contactCoveragePct = c.totalVoters > 0 ? (c.contactedCount / c.totalVoters) * 100 : null;
    const supportRatioPct = c.contactedCount > 0 ? (c.supporterCount / c.contactedCount) * 100 : null;
    const fieldCoveragePct = coverage.byCommune.get(c.commune.id)?.fieldCoveragePct ?? null;
    const teamCount = teamByCommune.get(c.commune.id) ?? 0;
    const teamDensityScore = teamCount > 0 ? teamScore(teamCount) : null;

    const weighted: { value: number; weight: number }[] = [];
    if (supportRatioPct != null) weighted.push({ value: supportRatioPct, weight: 0.4 });
    if (contactCoveragePct != null) weighted.push({ value: contactCoveragePct, weight: 0.25 });
    if (fieldCoveragePct != null) weighted.push({ value: fieldCoveragePct, weight: 0.2 });
    if (teamDensityScore != null) weighted.push({ value: teamDensityScore, weight: 0.15 });

    const totalWeight = weighted.reduce((s, w) => s + w.weight, 0);
    const compositeScore =
      totalWeight > 0
        ? weighted.reduce((s, w) => s + w.value * w.weight, 0) / totalWeight
        : null;

    return {
      commune: c.commune,
      totalVoters: c.totalVoters,
      contactedCount: c.contactedCount,
      supporterCount: c.supporterCount,
      contactCoveragePct,
      supportRatioPct,
      fieldCoveragePct,
      teamCount,
      teamDensityScore,
      compositeScore,
      dataComponents: weighted.length,
    };
  });

  rows.sort((a, b) => {
    if (a.compositeScore == null && b.compositeScore == null) return 0;
    if (a.compositeScore == null) return 1;
    if (b.compositeScore == null) return -1;
    return b.compositeScore - a.compositeScore;
  });

  const withScore = rows.filter((r) => r.compositeScore != null).length;

  return { rows, withScore, total: rows.length };
}

// نعيد استعمال getCommuneContactSummary (T-078) ونزيد بيانات الجماعة
// الكاملة (النوع + خط الأساس 2021) اللي ماكانتش مطلوبة فسياقه الأصلي.
async function getCommuneContactSummaryWithBaseline(supabase: SupabaseClient) {
  const [{ rows }, { data: communesRaw }] = await Promise.all([
    getCommuneContactSummary(supabase),
    supabase
      .from("communes")
      .select("id, name, type, registered_voters_est, leading_party_2021, leading_party_pct_2021"),
  ]);

  const baselineMap = new Map((communesRaw ?? []).map((c) => [c.id as string, c]));

  return {
    communes: rows.map((r) => ({
      commune: {
        id: r.commune.id,
        name: r.commune.name,
        type: r.commune.type,
        registered_voters_est: baselineMap.get(r.commune.id)?.registered_voters_est ?? null,
        leading_party_2021: baselineMap.get(r.commune.id)?.leading_party_2021 ?? null,
        leading_party_pct_2021: baselineMap.get(r.commune.id)?.leading_party_pct_2021 ?? null,
      },
      totalVoters: r.totalVoters,
      contactedCount: r.contactedCount,
      supporterCount: r.supporterCount,
    })),
  };
}
