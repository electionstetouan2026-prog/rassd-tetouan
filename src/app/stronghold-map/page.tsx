import PageShell from "@/components/PageShell";
import { createClient } from "@/lib/supabase/server";
import { IconTarget } from "@/components/icons";
import { getStrongholdMapData, type StrongholdRow } from "@/lib/strongholdMap";
import CommuneChoroplethMap from "@/components/CommuneChoroplethMap";
import ListSearch from "@/components/ListSearch";

export const dynamic = "force-dynamic";

function scoreTone(score: number | null) {
  if (score == null) return { bg: "var(--border)", fg: "var(--muted)" };
  if (score >= 60) return { bg: "var(--severity-neutral)", fg: "white" };
  if (score >= 35) return { bg: "var(--severity-medium)", fg: "white" };
  return { bg: "var(--severity-high)", fg: "white" };
}

function Bar({ label, pct, hint }: { label: string; pct: number | null; hint?: string }) {
  return (
    <div className="mb-2">
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-[var(--muted)] font-semibold">{label}</span>
        <span className="font-bold text-[var(--text)]">
          {pct == null ? "—" : `${pct.toFixed(0)}%`}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-[var(--bg)] overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{ width: `${pct ?? 0}%`, background: "var(--brand-blue)" }}
        />
      </div>
      {hint && <div className="text-[11px] text-[var(--muted)] mt-0.5">{hint}</div>}
    </div>
  );
}

function Card({ row }: { row: StrongholdRow }) {
  const tone = scoreTone(row.compositeScore);
  return (
    <div data-search-item className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <div className="font-extrabold text-[16px] text-[var(--heading)]">{row.commune.name}</div>
          <div className="text-xs text-[var(--muted)] mt-0.5">
            {row.commune.type}
            {row.commune.leading_party_2021 && (
              <>
                {" · خط أساس 2021: "}
                {row.commune.leading_party_2021}
                {row.commune.leading_party_pct_2021 != null &&
                  ` (${Math.round(row.commune.leading_party_pct_2021 * 100)}%)`}
              </>
            )}
          </div>
        </div>
        <div
          className="w-16 h-16 rounded-full flex flex-col items-center justify-center shrink-0 font-extrabold"
          style={{ background: tone.bg, color: tone.fg }}
        >
          <span className="text-lg leading-none">
            {row.compositeScore == null ? "—" : Math.round(row.compositeScore)}
          </span>
          <span className="text-[9px] font-bold leading-none mt-0.5">/ 100</span>
        </div>
      </div>

      {row.dataComponents === 0 ? (
        <p className="text-sm text-[var(--muted)] mb-1">
          لا توجد بيانات ميدانية كافية بعد لهاد الجماعة (لا تواصل ناخبين، لا خلايا، لا فريق مسجل).
        </p>
      ) : (
        <div className="mb-1">
          <Bar
            label="نسبة التأييد بين المتواصل معهم"
            pct={row.supportRatioPct}
            hint={
              row.contactedCount > 0
                ? `${row.supporterCount} مؤيد من ${row.contactedCount} متواصل معهم`
                : "لا يوجد تواصل مسجل بعد"
            }
          />
          <Bar
            label="تغطية التواصل من إجمالي الناخبين"
            pct={row.contactCoveragePct}
            hint={`${row.contactedCount.toLocaleString("ar-MA")} من ${row.totalVoters.toLocaleString("ar-MA")} ناخب`}
          />
          <Bar label="التغطية الميدانية بالخلايا" pct={row.fieldCoveragePct} />
          <Bar
            label="كثافة الفريق الميداني"
            pct={row.teamDensityScore}
            hint={`${row.teamCount} متطوع/مناضل نشيط`}
          />
        </div>
      )}

      <div className="pt-3 border-t border-[var(--border)] flex items-center gap-3 flex-wrap text-xs">
        <a href={`/voter-contact?commune=${row.commune.id}`} className="text-[var(--brand-blue)] font-semibold underline">
          متابعة الناخبين ↗
        </a>
        <a href="/presence" className="text-[var(--brand-blue)] font-semibold underline">
          خريطة الحضور ↗
        </a>
        <a href="/volunteers" className="text-[var(--brand-blue)] font-semibold underline">
          المتطوعون ↗
        </a>
      </div>
    </div>
  );
}

export default async function StrongholdMapPage() {
  const supabase = await createClient();
  const { rows, withScore, total } = await getStrongholdMapData(supabase);

  const top = rows.find((r) => r.compositeScore != null) ?? null;

  return (
    <PageShell
      title="الخريطة ومواطن القوة"
      subtitle="مؤشر مبسّط لترتيب أولويات العمل الميداني — مبني بالكامل من بيانات حملتنا الحية (التواصل مع الناخبين، الحضور الميداني، الفريق). أداة لتوجيه الجهد المتبقي، ماشي توقع انتخابي."
      icon={<IconTarget />}
    >

      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 mb-6 shadow-sm">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="text-sm font-bold text-[var(--muted)]">جماعات فيها مؤشر محسوب</div>
            <div className="text-[28px] font-extrabold text-[var(--heading)]">
              {withScore} / {total}
            </div>
          </div>
          {top && (
            <div>
              <div className="text-sm font-bold text-[var(--muted)]">أعلى مؤشر قوة ميدانية</div>
              <div className="text-[20px] font-extrabold text-[var(--heading)]">
                {top.commune.name} — {Math.round(top.compositeScore!)}/100
              </div>
            </div>
          )}
        </div>
        <p className="text-xs text-[var(--muted)] mt-4 leading-relaxed">
          <strong>قيد بيانات مهم وصادق</strong>: خط الأساس 2021 المعروض هو الحزب المتصدر لكل جماعة عموما وليس حصة
          حزب التقدم والاشتراكية تحديدا — حزب التقدم والاشتراكية لم يكن متصدرا فأي وحدة من الـ22 جماعة سنة 2021، فلا
          توجد بيانات تاريخية دقيقة للحزب على مستوى الجماعة يمكن الاعتماد عليها فحساب المؤشر. المؤشر إذن مبني كليا من
          بيانات ميدانية حية (تواصل، حضور، فريق)، ماشي من تاريخ انتخابي.
        </p>
      </div>

      <section className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 mb-6 shadow-sm">
        <h2 className="font-extrabold text-[var(--heading)] mb-1">الخريطة الجغرافية — حدود الـ22 جماعة</h2>
        <p className="text-xs text-[var(--muted)] mb-3">
          حدود الجماعات من OpenStreetMap (admin_level=8) — طبقة محلية محفوظة بلا حاجة لاتصال إنترنت وقت التشغيل،
          نفس المصدر المعتمد فالتطبيق المرجعي. اللون حسب مؤشر القوة الميدانية أعلاه (ماشي تاريخ انتخابي).
        </p>
        <CommuneChoroplethMap
          data={rows.map((r) => ({
            id: r.commune.id,
            name: r.commune.name,
            score: r.compositeScore,
            hint: r.dataComponents === 0 ? "لا بيانات ميدانية كافية بعد" : undefined,
          }))}
        />
      </section>

      <ListSearch scopeId="stronghold-list" placeholder="بحث باسم الجماعة..." />
      <div id="stronghold-list" className="grid md:grid-cols-2 gap-4">
        {rows.map((row) => (
          <Card key={row.commune.id} row={row} />
        ))}
      </div>
    </PageShell>
  );
}
