import type { createClient } from "@/lib/supabase/server";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

// "الوزن السياسي البنيوي" — طبقة تانية للترتيب التنافسي الرقمي، مستقلة
// كليا على بوليبراند (طلب علي، 17 شتنبر 2026): مين هو المرشح فعليا
// (منصب، تاريخ انتخابي، حزب) بغض النظر واش بوليبراند غطاه ولا لا.
// جدول public.candidates هو مصدر الحقيقة الوحيد لهاد المعلومة —
// راجع تعليق القسم 16 فـ supabase/schema.sql للسياق الكامل.
export type CandidateProfile = {
  name: string;
  isOurCandidate: boolean;
  party: string | null;
  currentPosition: string | null;
  electoralHistory: string | null;
  baselineStrength: number;
  notes: string | null;
};

/**
 * كيرجع Map بالاسم → ملف المرشح، لدمجه فـ digitalRanking.ts. اسم
 * غير موجود فالجدول (بعد إضافته لـ polibrandEntities.ts وقبل ما
 * يتزاد لـ candidates) كيرجع undefined عند البحث — الكود المستهلك
 * خاصو يتعامل مع هاد الحالة بلا تعطل.
 */
export async function getCandidatesMap(supabase: SupabaseClient): Promise<Map<string, CandidateProfile>> {
  const { data, error } = await supabase
    .from("candidates")
    .select("name, is_our_candidate, party, current_position, electoral_history, baseline_strength, notes");

  if (error) {
    console.error("getCandidatesMap select error:", JSON.stringify(error));
    return new Map();
  }

  const map = new Map<string, CandidateProfile>();
  for (const row of data ?? []) {
    map.set(row.name, {
      name: row.name,
      isOurCandidate: row.is_our_candidate,
      party: row.party,
      currentPosition: row.current_position,
      electoralHistory: row.electoral_history,
      baselineStrength: Number(row.baseline_strength),
      notes: row.notes,
    });
  }
  return map;
}
