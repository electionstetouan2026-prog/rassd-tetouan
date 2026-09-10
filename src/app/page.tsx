import PageShell from "@/components/PageShell";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

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
    <PageShell title="لوحة القيادة">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs rounded-full px-3 py-1 border border-[var(--border)] text-[var(--muted)]">
          دائرة تطوان · PPS
        </span>
      </div>
      <p className="text-sm text-[var(--muted)] mb-4">منصة إدارة الحملة — بيانات حية من قاعدة المراقبين ومكاتب التصويت</p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="الجماعات المسجلة" value={allCommunes.length} borderColor="var(--brand-blue)" />
        <StatCard label="مكاتب التصويت (بيانات حقيقية)" value={realStations.length} />
        <StatCard
          label="مكاتب مغطاة بمراقب مؤكد"
          value={coveredReal}
          borderColor="var(--severity-high)"
        />
        <StatCard label="إجمالي المراقبين" value={allObservers.length} />
      </div>

      <h2 className="text-lg font-semibold mb-3">حالة المراقبين</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {["مؤكد", "غير مؤكد", "غايب", "لم يُعيّن"].map((status) => (
          <StatCard key={status} label={status} value={statusCounts[status] ?? 0} />
        ))}
      </div>

      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 text-sm text-[var(--muted)]">
        لمتابعة تفاصيل المراقبين وتعيين مكاتب التصويت، انتقل إلى صفحة{" "}
        <a href="/observers" className="text-[var(--brand-blue)] underline">
          المراقبون
        </a>
        .
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
