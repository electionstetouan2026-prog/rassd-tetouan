import PageShell from "@/components/PageShell";
import { createClient } from "@/lib/supabase/server";
import { PLATFORM_LABEL, severityOf } from "@/lib/severity";

export const dynamic = "force-dynamic";

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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="مجموع الإشارات" value={total} />
        <StatCard label="خطورة عالية" value={severityCounts.high} color="var(--severity-high)" />
        <StatCard label="خطورة متوسطة" value={severityCounts.medium} color="var(--severity-medium)" />
        <StatCard label="بانتظار التحليل" value={severityCounts.pending} color="var(--severity-pending)" />
      </div>

      <h2 className="text-lg font-semibold mb-3">التوزيع حسب المنصة</h2>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
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
              <th className="text-right p-3">آخر جمع</th>
              <th className="text-right p-3">آخر نتيجة</th>
            </tr>
          </thead>
          <tbody>
            {(sources ?? []).map((s) => {
              const run = lastRunBySource.get(s.id);
              return (
                <tr key={s.id} className="border-t border-[var(--border)]">
                  <td className="p-3">{s.name}</td>
                  <td className="p-3">{s.type}</td>
                  <td className="p-3">
                    {run?.finished_at ? new Date(run.finished_at).toLocaleString("ar-MA") : "—"}
                  </td>
                  <td className="p-3">
                    <StatusDot status={run?.status} /> {run?.items_found ?? "—"}
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

function StatCard({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
      <div className="text-2xl font-bold" style={color ? { color } : undefined}>
        {value}
      </div>
      <div className="text-sm text-[var(--muted)]">{label}</div>
    </div>
  );
}

function StatusDot({ status }: { status?: string }) {
  const color =
    status === "success" ? "#16a34a" : status === "error" ? "#dc2626" : "#9ca3af";
  return (
    <span
      className="inline-block w-2 h-2 rounded-full ml-1"
      style={{ background: color }}
    />
  );
}
