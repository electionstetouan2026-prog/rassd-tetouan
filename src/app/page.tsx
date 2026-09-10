import PageShell from "@/components/PageShell";
import { createClient } from "@/lib/supabase/server";
import { IconDashboard } from "@/components/icons";

export const dynamic = "force-dynamic";

const STATUS_ORDER = ["مؤكد", "غير مؤكد", "غايب", "لم يُعيّن"] as const;
const STATUS_COLOR: Record<string, string> = {
  "مؤكد": "var(--severity-neutral)",
  "غير مؤكد": "var(--severity-medium)",
  "غايب": "var(--severity-high)",
  "لم يُعيّن": "var(--severity-pending)",
};

export default async function DashboardPage() {
  const supabase = await createClient();

  const [{ data: stations }, { data: observers }, { data: communes }] = await Promise.all([
    supabase.from("polling_stations").select("id, is_mock"),
    supabase.from("observers").select("id, confirmation_status, polling_station_id"),
    supabase.from("communes").select("id, name, has_detailed_station_data"),
  ]);

  const allStations = stations ?? [];
  const allObservers = observers ?? [];
  const allCommunes = communes ?? [];

  const realStations = allStations.filter((s) => !s.is_mock);
  const confirmedStationIds = new Set(
    allObservers
      .filter((o) => o.confirmation_status === "مؤكد" && o.polling_station_id)
      .map((o) => o.polling_station_id)
  );
  const coveredReal = realStations.filter((s) => confirmedStationIds.has(s.id)).length;

  const statusCounts: Record<string, number> = {};
  for (const o of allObservers) {
    statusCounts[o.confirmation_status] = (statusCounts[o.confirmation_status] ?? 0) + 1;
  }

  return (
    <PageShell
      title="لوحة القيادة"
      subtitle="منصة إدارة الحملة — بيانات حية من قاعدة المراقبين ومكاتب التصويت"
      icon={<IconDashboard />}
    >
      <div className="flex items-center gap-2 mb-5">
        <span className="text-sm rounded-full px-4 py-1.5 bg-[var(--card)] border border-[var(--border)] text-[var(--brand-blue)] font-bold shadow-sm">
          دائرة تطوان · PPS
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="الجماعات المسجلة" value={allCommunes.length} accent="var(--brand-blue)" />
        <StatCard label="مكاتب التصويت (بيانات حقيقية)" value={realStations.length} accent="var(--accent-teal)" />
        <StatCard label="مكاتب مغطاة بمراقب مؤكد" value={coveredReal} accent="var(--severity-neutral)" />
        <StatCard label="إجمالي المراقبين" value={allObservers.length} accent="var(--severity-medium)" />
      </div>

      <h2 className="text-xl font-extrabold mb-4 text-[var(--heading)]">حالة المراقبين</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        {STATUS_ORDER.map((status) => (
          <div
            key={status}
            className="rounded-xl bg-[var(--card)] border border-[var(--border)] p-5 text-center shadow-sm"
          >
            <div className="text-3xl font-extrabold" style={{ color: STATUS_COLOR[status] }}>
              {statusCounts[status] ?? 0}
            </div>
            <div className="text-sm font-bold text-[var(--muted)] mt-1.5">{status}</div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 text-[15px] text-[var(--muted)] flex items-center justify-between flex-wrap gap-3 shadow-sm">
        <span>لمتابعة تفاصيل المراقبين وتعيين مكاتب التصويت، انتقل إلى صفحة المراقبون</span>
        <a
          href="/observers"
          className="text-white font-bold px-5 py-2 rounded-lg bg-[var(--brand-blue)] hover:bg-[var(--brand-blue-hover)] transition shrink-0"
        >
          فتح المراقبون ←
        </a>
      </div>
    </PageShell>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent: string;
}) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm" style={{ borderTop: `3px solid ${accent}` }}>
      <div className="text-3xl font-extrabold text-[var(--heading)]">{value}</div>
      <div className="text-sm font-bold text-[var(--muted)] mt-1.5">{label}</div>
    </div>
  );
}
