import PageShell from "@/components/PageShell";
import { createClient } from "@/lib/supabase/server";
import { PLATFORM_LABEL, severityOf } from "@/lib/severity";

export const dynamic = "force-dynamic";

function relativeAr(iso: string | null | undefined) {
  if (!iso) return "—";
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "الآن";
  if (mins < 60) return `منذ ${mins} دقيقة`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `منذ ${hours} ساعة`;
  const days = Math.floor(hours / 24);
  return `منذ ${days} يوم`;
}

export default async function DashboardPage() {
  const supabase = await createClient();

  const [{ data: mentions }, { data: sources }] = await Promise.all([
    supabase
      .from("mentions")
      .select("id, platform, analyzed_at, threat_score, collected_at")
      .order("collected_at", { ascending: false })
      .limit(1000),
    supabase.from("sources").select("id, name, type, is_active, url"),
  ]);

  const allMentions = mentions ?? [];
  const total = allMentions.length;
  const severityCounts = { high: 0, medium: 0, neutral: 0, pending: 0 };
  const platformCounts: Record<string, number> = {};
  for (const m of allMentions) {
    severityCounts[severityOf(m)]++;
    platformCounts[m.platform ?? "other"] = (platformCounts[m.platform ?? "other"] ?? 0) + 1;
  }

  const { data: lastRuns } = await supabase
    .from("collection_runs")
    .select("source_id, finished_at, status, items_found")
    .order("finished_at", { ascending: false, nullsFirst: false })
    .limit(200);

  const lastRunBySource = new Map<string, NonNullable<typeof lastRuns>[number]>();
  for (const run of lastRuns ?? []) {
    if (run.source_id && !lastRunBySource.has(run.source_id)) {
      lastRunBySource.set(run.source_id, run);
    }
  }

  return (
    <PageShell title="لوحة القيادة">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs rounded-full px-3 py-1 bg-green-600/10 text-green-700 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-green-600" /> بيانات حية
        </span>
        <span className="text-xs rounded-full px-3 py-1 border border-[var(--border)] text-[var(--muted)]">
          دائرة تطوان · PPS
        </span>
      </div>
      <p className="text-sm text-[var(--muted)] mb-4">رصد حقيقي وشفاف — بلا مؤشرات مزخرفة</p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="إجمالي الإشارات" value={total} borderColor="var(--brand-blue)" />
        <StatCard
          label="تهديدات عالية (≤60)"
          value={severityCounts.high}
          borderColor="var(--severity-high)"
        />
        <StatCard
          label="فالانتظار للتحليل"
          value={severityCounts.pending}
          borderColor="var(--severity-medium)"
        />
        <StatCard label="عدد المصادر" value={(sources ?? []).length} />
      </div>

      <h2 className="text-lg font-semibold mb-3">التوزيع حسب المنصة</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {Object.entries(PLATFORM_LABEL).map(([key, label]) => (
          <StatCard key={key} label={label} value={platformCounts[key] ?? 0} />
        ))}
      </div>

      <h2 className="text-lg font-semibold mb-3">حالة مصادر الجمع</h2>
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[var(--surface)] text-[var(--muted)]">
            <tr>
              <th className="text-right p-3">المصدر</th>
              <th className="text-right p-3">النوع</th>
              <th className="text-right p-3">أخر جمع ناجح</th>
            </tr>
          </thead>
          <tbody>
            {(sources ?? []).map((s) => {
              const run = lastRunBySource.get(s.id);
              return (
                <tr key={s.id} className="border-t border-[var(--border)]">
                  <td className="p-3">
                    {s.name} {s.type === "rss" && <span className="text-[var(--muted)]">(RSS)</span>}
                  </td>
                  <td className="p-3">{s.type}</td>
                  <td className="p-3">
                    <StatusDot status={run?.status} /> {relativeAr(run?.finished_at)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </PageShell>
  );
}

function StatCard({
  label,
  value,
  borderColor,
}: {
  label: string;
  value: number;
  borderColor?: string;
}) {
  return (
    <div
      className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4"
      style={borderColor ? { borderTop: `3px solid ${borderColor}` } : undefined}
    >
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-sm text-[var(--muted)]">{label}</div>
    </div>
  );
}

function StatusDot({ status }: { status?: string }) {
  const color =
    status === "success" ? "#16a34a" : status === "error" ? "#dc2626" : "#f59e0b";
  return (
    <span
      className="inline-block w-2 h-2 rounded-full ml-1"
      style={{ background: color }}
    />
  );
}
