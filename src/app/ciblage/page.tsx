import PageShell from "@/components/PageShell";
import { createClient } from "@/lib/supabase/server";
import {
  addKeyword,
  addSource,
  addTargetAccount,
  toggleKeyword,
  toggleSource,
  toggleTargetAccount,
} from "./actions";

export const dynamic = "force-dynamic";

const CATEGORY_LABEL: Record<string, string> = {
  candidate: "المرشح/سياق عام",
  competitor: "منافس",
  issue: "قضية محلية",
  general: "عام",
};

const TARGET_CATEGORY_LABEL: Record<string, string> = {
  attacker: "مهاجم",
  competitor: "منافس",
  sympathizer: "متعاطف",
  other: "آخر",
};

export default async function CiblagePage() {
  const supabase = await createClient();

  const [{ data: keywords }, { data: sources }, { data: targetAccounts }] = await Promise.all([
    supabase.from("keywords").select("*").order("created_at", { ascending: false }),
    supabase.from("sources").select("*").eq("type", "rss").order("created_at", { ascending: false }),
    supabase
      .from("target_accounts")
      .select("*")
      .order("created_at", { ascending: false }),
  ]);

  return (
    <PageShell title="الاستهداف (Ciblage)">
      <section className="mb-10">
        <h2 className="text-lg font-semibold mb-3">كلمات المراقبة</h2>
        <form action={addKeyword} className="flex gap-2 mb-4 flex-wrap">
          <input
            name="term"
            placeholder="كلمة/عبارة"
            required
            className="rounded-lg border border-[var(--border)] px-3 py-2 bg-[var(--card)] flex-1 min-w-[180px]"
          />
          <select
            name="category"
            className="rounded-lg border border-[var(--border)] px-3 py-2 bg-[var(--card)]"
          >
            {Object.entries(CATEGORY_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          <button className="rounded-lg bg-[var(--brand-blue)] text-white px-4 py-2">إضافة</button>
        </form>
        <div className="flex flex-wrap gap-2">
          {(keywords ?? []).map((k) => (
            <form key={k.id} action={toggleKeyword.bind(null, k.id, !k.is_active)}>
              <button
                className={`text-xs rounded-full px-3 py-1 border ${
                  k.is_active
                    ? "border-[var(--brand-blue)] text-[var(--brand-blue)]"
                    : "border-[var(--border)] text-[var(--muted)] line-through"
                }`}
              >
                {k.term} · {CATEGORY_LABEL[k.category] ?? k.category}
              </button>
            </form>
          ))}
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-lg font-semibold mb-3">المصادر الصحفية (RSS)</h2>
        <form action={addSource} className="flex gap-2 mb-4 flex-wrap">
          <input
            name="name"
            placeholder="اسم المنبر"
            required
            className="rounded-lg border border-[var(--border)] px-3 py-2 bg-[var(--card)]"
          />
          <input
            name="url"
            placeholder="رابط RSS feed"
            required
            className="rounded-lg border border-[var(--border)] px-3 py-2 bg-[var(--card)] flex-1 min-w-[220px]"
          />
          <button className="rounded-lg bg-[var(--brand-blue)] text-white px-4 py-2">إضافة</button>
        </form>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] divide-y divide-[var(--border)]">
          {(sources ?? []).map((s) => (
            <div key={s.id} className="flex justify-between items-center p-3 text-sm">
              <div>
                <div className="font-medium">{s.name}</div>
                <div className="text-xs text-[var(--muted)]">{s.url}</div>
                {s.notes && <div className="text-xs text-[var(--muted)]">{s.notes}</div>}
              </div>
              <form action={toggleSource.bind(null, s.id, !s.is_active)}>
                <button
                  className={`text-xs rounded-full px-3 py-1 border ${
                    s.is_active ? "border-green-600 text-green-700" : "border-[var(--border)] text-[var(--muted)]"
                  }`}
                >
                  {s.is_active ? "نشط" : "معطل"}
                </button>
              </form>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3">الحسابات والصفحات المستهدفة (فيسبوك/انستغرام)</h2>
        <form action={addTargetAccount} className="grid grid-cols-2 gap-2 mb-4">
          <input
            name="url"
            placeholder="رابط الصفحة/الحساب"
            required
            className="col-span-2 rounded-lg border border-[var(--border)] px-3 py-2 bg-[var(--card)]"
          />
          <select
            name="platform"
            required
            defaultValue=""
            className="rounded-lg border border-[var(--border)] px-3 py-2 bg-[var(--card)]"
          >
            <option value="" disabled>
              المنصة
            </option>
            <option value="facebook">فيسبوك</option>
            <option value="instagram">انستغرام</option>
            <option value="tiktok">تيكتوك</option>
            <option value="other">أخرى</option>
          </select>
          <select
            name="category"
            className="rounded-lg border border-[var(--border)] px-3 py-2 bg-[var(--card)]"
          >
            {Object.entries(TARGET_CATEGORY_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          <input
            name="label"
            placeholder="تسمية (اختياري)"
            className="rounded-lg border border-[var(--border)] px-3 py-2 bg-[var(--card)]"
          />
          <input
            name="note"
            placeholder="ملاحظة (اختياري)"
            className="rounded-lg border border-[var(--border)] px-3 py-2 bg-[var(--card)]"
          />
          <button className="col-span-2 rounded-lg bg-[var(--brand-blue)] text-white px-4 py-2">
            إضافة
          </button>
        </form>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] divide-y divide-[var(--border)] max-h-[400px] overflow-y-auto">
          {(targetAccounts ?? []).map((t) => (
            <div key={t.id} className="flex justify-between items-center p-3 text-sm">
              <div>
                <div className="font-medium">{t.label || t.url}</div>
                <a href={t.url} target="_blank" className="text-xs text-[var(--brand-blue)] underline">
                  {t.url}
                </a>
                <div className="flex gap-2 mt-1">
                  <span className="text-xs rounded-full px-2 py-0.5 border border-[var(--border)]">
                    {t.platform}
                  </span>
                  <span className="text-xs rounded-full px-2 py-0.5 border border-[var(--border)]">
                    {TARGET_CATEGORY_LABEL[t.category] ?? t.category}
                  </span>
                </div>
                {t.note && <div className="text-xs text-[var(--muted)] mt-1">{t.note}</div>}
              </div>
              <form action={toggleTargetAccount.bind(null, t.id, !t.is_active)}>
                <button
                  className={`text-xs rounded-full px-3 py-1 border ${
                    t.is_active ? "border-green-600 text-green-700" : "border-[var(--border)] text-[var(--muted)]"
                  }`}
                >
                  {t.is_active ? "نشط" : "معطل"}
                </button>
              </form>
            </div>
          ))}
        </div>
      </section>
    </PageShell>
  );
}
