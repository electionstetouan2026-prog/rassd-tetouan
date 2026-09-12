import PageShell from "@/components/PageShell";
import { createClient } from "@/lib/supabase/server";
import { IconFlame } from "@/components/icons";
import { getHotBlocksData, getStationHotBlocks } from "@/lib/hotblocks";

export const dynamic = "force-dynamic";

function pct(value: number | null) {
  return value == null ? "—" : `${value.toFixed(0)}%`;
}

function priorityLabel(score: number) {
  if (score >= 70) return { label: "أولوية عالية", color: "var(--severity-high)" };
  if (score >= 40) return { label: "أولوية متوسطة", color: "var(--severity-medium)" };
  return { label: "أولوية منخفضة", color: "var(--severity-neutral)" };
}

export default async function HotBlocksPage({
  searchParams,
}: {
  searchParams: Promise<{ commune?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const { rows, totalVoters } = await getHotBlocksData(supabase);

  const selected = params.commune ? rows.find((r) => r.commune.id === params.commune) : null;
  const stations = selected ? await getStationHotBlocks(supabase, selected.commune.id) : null;

  const highPriorityCount = rows.filter((r) => r.priorityScore >= 70).length;

  return (
    <PageShell
      title="الكتل الساخنة"
      subtitle="ترتيب الجماعات حسب كثافة الناخبين المستوردين مقابل ضعف تغطيتنا يوم الاقتراع — بديل مبسّط لنظام المطابقة الدقيقة فالتطبيق المرجعي (قاعدتنا لا تحتوي عناوين كاملة، فقط جماعة/مكتب تصويت لكل ناخب)."
      icon={<IconFlame />}
    >
      <div className="grid sm:grid-cols-3 gap-4 mb-6">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm">
          <div className="text-sm font-bold text-[var(--muted)]">إجمالي الناخبين المستوردين</div>
          <div className="text-[28px] font-extrabold text-[var(--heading)]">{totalVoters.toLocaleString("ar")}</div>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm">
          <div className="text-sm font-bold text-[var(--muted)]">عدد الجماعات</div>
          <div className="text-[28px] font-extrabold text-[var(--heading)]">{rows.length}</div>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm">
          <div className="text-sm font-bold text-[var(--muted)]">جماعات بأولوية عالية</div>
          <div className="text-[28px] font-extrabold" style={{ color: "var(--severity-high)" }}>
            {highPriorityCount}
          </div>
        </div>
      </div>

      {totalVoters === 0 && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 mb-6 text-sm text-[var(--muted)]">
          ما تزال قاعدة الناخبين ما تعبّاتش. راجع <code>supabase/import_voters.sql</code> بعد رفع
          voters_export.csv.
        </div>
      )}
      {selected ? (
        <div>
          <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
            <div>
              <a href="/hot-blocks" className="text-sm text-[var(--brand-blue)] font-bold underline">
                ← رجوع لكل الجماعات
              </a>
              <h2 className="text-xl font-extrabold text-[var(--heading)] mt-1">
                مكاتب التصويت — {selected.commune.name}
              </h2>
            </div>
            <span
              className="text-xs font-extrabold rounded-full px-3 py-1.5 text-white"
              style={{ background: priorityLabel(selected.priorityScore).color }}
            >
              {priorityLabel(selected.priorityScore).label} ({selected.priorityScore})
            </span>
          </div>
          <div className="space-y-2">
            {(stations ?? []).map((s) => (
              <div
                key={s.id}
                className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 flex items-center justify-between gap-3 shadow-sm"
              >
                <div>
                  <div className="font-bold text-[var(--heading)]">
                    {s.subOfficeNumber ? `مكتب ${s.subOfficeNumber} — ` : ""}
                    {s.centerName}
                  </div>
                  <div className="text-sm text-[var(--muted)] mt-0.5">{s.voterCount.toLocaleString("ar")} ناخب</div>
                </div>
                <span
                  className="text-xs font-extrabold rounded-full px-3 py-1.5 shrink-0"
                  style={{
                    background: s.hasConfirmedObserver ? "var(--severity-neutral)" : "var(--severity-medium)",
                    color: "white",
                  }}
                >
                  {s.hasConfirmedObserver ? "مراقب مؤكد" : "بلا مراقب مؤكد"}
                </span>
              </div>
            ))}
            {(stations ?? []).length === 0 && (
              <p className="text-[15px] text-[var(--muted)]">لا توجد مكاتب تصويت حقيقية مُدخلة لهاد الجماعة.</p>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-2.5">
          {rows.map((r) => {
            const p = priorityLabel(r.priorityScore);
            return (
              <a
                key={r.commune.id}
                href={`/hot-blocks?commune=${r.commune.id}`}
                className="block rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm hover:shadow-md transition"
              >
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <div className="font-extrabold text-[16px] text-[var(--heading)]">{r.commune.name}</div>
                    <div className="text-sm text-[var(--muted)] mt-0.5">
                      {r.voterCount.toLocaleString("ar")} ناخب · تغطية ميدانية {pct(r.fieldCoveragePct)} · تغطية
                      يوم الاقتراع {pct(r.electionDayCoveragePct)}
                    </div>
                  </div>
                  <span
                    className="text-xs font-extrabold rounded-full px-3 py-1.5 text-white shrink-0"
                    style={{ background: p.color }}
                  >
                    {p.label} ({r.priorityScore})
                  </span>
                </div>
              </a>
            );
          })}
        </div>
      )}
    </PageShell>
  );
}
