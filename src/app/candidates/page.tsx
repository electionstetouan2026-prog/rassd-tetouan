import PageShell from "@/components/PageShell";
import { createClient } from "@/lib/supabase/server";
import { IconIdBadge } from "@/components/icons";
import { updateCandidateProfile } from "./actions";

export const dynamic = "force-dynamic";

type CandidateRow = {
  id: string;
  name: string;
  is_our_candidate: boolean;
  party: string | null;
  current_position: string | null;
  electoral_history: string | null;
  baseline_strength: number;
  notes: string | null;
};

export default async function CandidatesPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("candidates")
    .select("id, name, is_our_candidate, party, current_position, electoral_history, baseline_strength, notes")
    .order("baseline_strength", { ascending: false });

  const rows = (data ?? []) as CandidateRow[];

  return (
    <PageShell
      title="ملفات المرشحين"
      subtitle="سجل الـ17 لائحة بدائرة تطوان — مصدر «الوزن السياسي البنيوي» المعروض جنب الترتيب الرقمي فـ /ranking، مستقل كليا على إشارات بوليبراند"
      icon={<IconIdBadge />}
    >
      <div className="rounded-xl px-5 py-4 mb-6 text-xs leading-relaxed text-[var(--muted)] bg-[var(--card)] border border-[var(--border)]">
        <strong className="text-[var(--text)]">قيد بيانات صادق</strong>: الأسماء، الأحزاب والمناصب مبنية على بحث فالصحافة
        المحلية + بوابة الانتخابات الرسمية (elections.ma) + تدقيق يدوي من علي (17 شتنبر 2026) — 16 من 17 لائحة مؤكدين
        (FFD بلا معلومة متوفرة لحد الآن). «الوزن البنيوي» (0-100) تقدير أولي يدوي حسب المنصب/الأقدمية الانتخابية —
        قابل للتعديل هنا مباشرة، وماشي مقاس علمي دقيق. إضافة اسم جديد كليا كتمر عبر الكود (src/lib/polibrandEntities.ts)
        ماشي من هاد الصفحة.
      </div>

      <div className="space-y-3">
        {rows.map((c) => (
          <form
            key={c.id}
            action={updateCandidateProfile.bind(null, c.id)}
            className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm"
          >
            <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
              <div className="font-extrabold text-[var(--heading)] text-[15px]">
                {c.name}
                {c.is_our_candidate && (
                  <span className="mr-2 text-xs font-bold rounded-full px-2.5 py-1 bg-[var(--brand-blue)] text-white">
                    مرشحنا
                  </span>
                )}
              </div>
              <button className="text-xs font-bold rounded-full px-4 py-1.5 bg-[var(--brand-blue)] text-white hover:bg-[var(--brand-blue-hover)] transition">
                حفظ
              </button>
            </div>
            <div className="grid gap-2.5 sm:grid-cols-2">
              <input
                name="party"
                defaultValue={c.party ?? ""}
                placeholder="الحزب"
                className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm bg-[var(--bg)] focus:border-[var(--brand-blue)] focus:outline-none"
              />
              <input
                name="current_position"
                defaultValue={c.current_position ?? ""}
                placeholder="المنصب الحالي"
                className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm bg-[var(--bg)] focus:border-[var(--brand-blue)] focus:outline-none"
              />
              <input
                name="electoral_history"
                defaultValue={c.electoral_history ?? ""}
                placeholder="التاريخ الانتخابي"
                className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm bg-[var(--bg)] focus:border-[var(--brand-blue)] focus:outline-none"
              />
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-[var(--muted)] shrink-0">الوزن البنيوي (0-100)</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  name="baseline_strength"
                  defaultValue={c.baseline_strength}
                  className="w-24 rounded-lg border border-[var(--border)] px-3 py-2 text-sm bg-[var(--bg)] focus:border-[var(--brand-blue)] focus:outline-none"
                />
              </div>
              <input
                name="notes"
                defaultValue={c.notes ?? ""}
                placeholder="ملاحظة (اختياري)"
                className="sm:col-span-2 rounded-lg border border-[var(--border)] px-3 py-2 text-sm bg-[var(--bg)] focus:border-[var(--brand-blue)] focus:outline-none"
              />
            </div>
          </form>
        ))}
        {rows.length === 0 && (
          <p className="text-sm text-[var(--muted)]">
            جدول candidates فارغ بعد — نفّذ قسم 16 من supabase/schema.sql باش تتزاد بيانات المرشحين.
          </p>
        )}
      </div>
    </PageShell>
  );
}
