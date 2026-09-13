import PageShell from "@/components/PageShell";
import { createClient } from "@/lib/supabase/server";
import { IconLandmark } from "@/components/icons";
import { getElectoralContextData } from "@/lib/electoralContext";
import { addPartyOfficial, deletePartyOfficial } from "./actions";

export const dynamic = "force-dynamic";

export default async function ElectoralContextPage() {
  const supabase = await createClient();
  const [{ communeRows, totalVoters, totalStations, totalCommunes, officials }, { data: communesList }] =
    await Promise.all([
      getElectoralContextData(supabase),
      supabase.from("communes").select("id, name").order("name"),
    ]);

  const currentOfficials = officials.filter((o) => o.category === "حالي");
  const historicalOfficials = officials.filter((o) => o.category === "تاريخي");

  return (
    <PageShell
      title="السياق الانتخابي"
      subtitle="دائرة تطوان التشريعية — لقطة حقيقية من بياناتنا (ناخبين، مكاتب، خط أساس 2021) + سجل مسؤولي/مرشحي الحزب"
      icon={<IconLandmark />}
    >
      <div className="grid sm:grid-cols-3 gap-4 mb-6">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm">
          <div className="text-sm font-bold text-[var(--muted)]">الناخبون (مستوردون فعليا)</div>
          <div className="text-[28px] font-extrabold text-[var(--heading)]">
            {totalVoters.toLocaleString("ar-MA")}
          </div>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm">
          <div className="text-sm font-bold text-[var(--muted)]">مكاتب التصويت الحقيقية</div>
          <div className="text-[28px] font-extrabold text-[var(--heading)]">{totalStations}</div>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm">
          <div className="text-sm font-bold text-[var(--muted)]">جماعات الإقليم</div>
          <div className="text-[28px] font-extrabold text-[var(--heading)]">{totalCommunes}</div>
        </div>
      </div>

      <div className="rounded-xl px-5 py-4 mb-6 text-sm leading-relaxed text-white" style={{ background: "linear-gradient(120deg, var(--brand-navy) 0%, var(--brand-navy-2) 100%)" }}>
        <strong>قيد بيانات صادق</strong>: لا تتوفر عندنا حاليا بيانات مقاعد حزب التقدم والاشتراكية تحديدا (لا على
        مستوى الجماعة ولا الدائرة ككل)، ولا مسار تشريعي تاريخي مسجل — خط الأساس 2021 أدناه هو الحزب المتصدر عموما
        لكل جماعة (ولم يكن حزب التقدم والاشتراكية متصدرا فأي واحدة منها). أسماء المسؤولين/المرشحين أسفله تُدخل يدويا
        من طرف علي.
      </div>

      <section className="rounded-xl border border-[var(--border)] bg-[var(--card)] mb-8 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-[var(--border)]">
          <h2 className="font-extrabold text-[var(--heading)]">خط الأساس 2021 والناخبون الحقيقيون — حسب الجماعة</h2>
          <p className="text-xs text-[var(--muted)] mt-1">
            "المتصدر 2021" و"المشاركة" من النتائج الرسمية (elections.ma). "ناخبونا" من قاعدة الناخبين الحقيقية
            المستوردة (269,749 ناخب، T-076).
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[720px]">
            <thead className="bg-[var(--bg)] text-xs text-[var(--muted)]">
              <tr>
                <th className="px-4 py-3 text-right font-bold">الجماعة</th>
                <th className="px-4 py-3 text-right font-bold">المتصدر 2021</th>
                <th className="px-4 py-3 text-right font-bold">مقاعده</th>
                <th className="px-4 py-3 text-right font-bold">مشاركة 2021</th>
                <th className="px-4 py-3 text-right font-bold">ناخبونا</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {communeRows.map((r) => (
                <tr key={r.commune.id}>
                  <td className="px-4 py-3 font-bold text-[var(--heading)]">
                    {r.commune.name}
                    <span className="text-xs text-[var(--muted)] font-normal"> · {r.commune.type}</span>
                  </td>
                  <td className="px-4 py-3 text-[var(--text)]">{r.commune.leading_party_2021 ?? "—"}</td>
                  <td className="px-4 py-3 text-[var(--text)]">
                    {r.commune.leading_party_seats_2021 != null && r.commune.seats_total_2021 != null
                      ? `${r.commune.leading_party_seats_2021} / ${r.commune.seats_total_2021}`
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-[var(--text)]">
                    {r.commune.participation_rate_2021 != null
                      ? `${Math.round(r.commune.participation_rate_2021 * 100)}%`
                      : "—"}
                  </td>
                  <td className="px-4 py-3 font-bold text-[var(--heading)]">{r.realVoters.toLocaleString("ar-MA")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mb-8 rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm">
        <h2 className="text-lg font-extrabold mb-4 text-[var(--heading)]">إضافة مسؤول/مرشح</h2>
        <form action={addPartyOfficial} className="grid grid-cols-2 gap-3">
          <input
            name="full_name"
            placeholder="الاسم الكامل"
            required
            className="rounded-lg border border-[var(--border)] px-3.5 py-2.5 text-[15px] bg-[var(--bg)] focus:border-[var(--brand-blue)] focus:outline-none"
          />
          <input
            name="role"
            placeholder="الدور (مثال: وكيل اللائحة 2026، مستشار جماعي)"
            className="rounded-lg border border-[var(--border)] px-3.5 py-2.5 text-[15px] bg-[var(--bg)] focus:border-[var(--brand-blue)] focus:outline-none"
          />
          <select
            name="commune_id"
            defaultValue=""
            className="rounded-lg border border-[var(--border)] px-3.5 py-2.5 text-[15px] bg-[var(--bg)]"
          >
            <option value="">— الجماعة (اختياري) —</option>
            {(communesList ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select
            name="category"
            defaultValue="حالي"
            className="rounded-lg border border-[var(--border)] px-3.5 py-2.5 text-[15px] bg-[var(--bg)]"
          >
            <option value="حالي">حالي</option>
            <option value="تاريخي">تاريخي</option>
          </select>
          <input
            name="notes"
            placeholder="ملاحظة (اختياري)"
            className="col-span-2 rounded-lg border border-[var(--border)] px-3.5 py-2.5 text-[15px] bg-[var(--bg)] focus:border-[var(--brand-blue)] focus:outline-none"
          />
          <button className="col-span-2 rounded-lg bg-[var(--brand-blue)] text-white font-bold px-4 py-2.5 hover:bg-[var(--brand-blue-hover)] transition">
            + إضافة
          </button>
        </form>
      </section>

      <div className="grid md:grid-cols-2 gap-5">
        <section className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm">
          <h2 className="font-extrabold text-[var(--heading)] mb-3">مسؤولون/مرشحون حاليون ({currentOfficials.length})</h2>
          <div className="divide-y divide-[var(--border)]">
            {currentOfficials.map((o) => (
              <div key={o.id} className="flex items-start justify-between gap-3 py-3">
                <div>
                  <div className="font-bold text-[var(--text)]">{o.full_name}</div>
                  <div className="text-xs text-[var(--muted)] mt-0.5">
                    {o.role ?? ""}
                    {o.role && o.commune ? " · " : ""}
                    {o.commune?.name ?? ""}
                  </div>
                  {o.notes && <div className="text-xs text-[var(--muted)] mt-0.5">{o.notes}</div>}
                </div>
                <form action={deletePartyOfficial.bind(null, o.id)}>
                  <button
                    className="text-xs font-bold rounded-full px-3 py-1.5 shrink-0"
                    style={{ background: "var(--severity-high)", color: "white" }}
                  >
                    حذف
                  </button>
                </form>
              </div>
            ))}
            {currentOfficials.length === 0 && (
              <p className="text-sm text-[var(--muted)] py-3">ماكاينش أسماء مُدخلة بعد.</p>
            )}
          </div>
        </section>

        <section className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm">
          <h2 className="font-extrabold text-[var(--heading)] mb-3">أسماء تاريخية ({historicalOfficials.length})</h2>
          <div className="divide-y divide-[var(--border)]">
            {historicalOfficials.map((o) => (
              <div key={o.id} className="flex items-start justify-between gap-3 py-3">
                <div>
                  <div className="font-bold text-[var(--text)]">{o.full_name}</div>
                  <div className="text-xs text-[var(--muted)] mt-0.5">
                    {o.role ?? ""}
                    {o.role && o.commune ? " · " : ""}
                    {o.commune?.name ?? ""}
                  </div>
                  {o.notes && <div className="text-xs text-[var(--muted)] mt-0.5">{o.notes}</div>}
                </div>
                <form action={deletePartyOfficial.bind(null, o.id)}>
                  <button
                    className="text-xs font-bold rounded-full px-3 py-1.5 shrink-0"
                    style={{ background: "var(--severity-high)", color: "white" }}
                  >
                    حذف
                  </button>
                </form>
              </div>
            ))}
            {historicalOfficials.length === 0 && (
              <p className="text-sm text-[var(--muted)] py-3">ماكاينش أسماء مُدخلة بعد.</p>
            )}
          </div>
        </section>
      </div>
    </PageShell>
  );
}
