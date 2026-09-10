import PageShell from "@/components/PageShell";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const STATUS_ORDER = ["مؤكد", "غير مؤكد", "غايب", "لم يُعيّن"] as const;
const STATUS_COLOR: Record<string, string> = {
  "مؤكد": "var(--severity-neutral)",
  "غير مؤكد": "var(--severity-medium)",
  "غايب": "var(--severity-high)",
  "لم يُعيّن": "var(--severity-pending)",
};
const STATUS_ROTATE: Record<string, string> = {
  "مؤكد": "-rotate-2",
  "غير مؤكد": "rotate-1",
  "غايب": "-rotate-1",
  "لم يُعيّن": "rotate-2",
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
    <PageShell title="لوحة القيادة">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs rounded-full px-3 py-1 border-2 border-dashed border-[var(--brand-blue)] text-[var(--brand-blue)] font-semibold">
          دائرة تطوان · PPS
        </span>
      </div>
      <p className="text-sm text-[var(--muted)] mb-5">منصة إدارة الحملة — بيانات حية من قاعدة المراقبين ومكاتب التصويت</p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="الجماعات المسجلة" value={allCommunes.length} borderColor="var(--brand-blue)" />
        <StatCard label="مكاتب التصويت (بيانات حقيقية)" value={realStations.length} />
        <StatCard
          label="مكاتب مغطاة بمراقب مؤكد"
          value={coveredReal}
          borderColor="var(--severity-neutral)"
        />
        <StatCard label="إجمالي المراقبين" value={allObservers.length} />
      </div>

      <h2 className="text-lg font-extrabold mb-3 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-[var(--brand-blue)] inline-block" />
        حالة المراقبين
      </h2>
      <div className="flex flex-wrap gap-4 mb-8">
        {STATUS_ORDER.map((status) => (
          <div
            key={status}
            className={`border-2 rounded-lg px-5 py-3 text-center font-extrabold ${STATUS_ROTATE[status]}`}
            style={{ borderColor: STATUS_COLOR[status], color: STATUS_COLOR[status] }}
          >
            <div className="text-2xl">{statusCounts[status] ?? 0}</div>
            <div className="text-[11px] font-semibold mt-0.5">{status}</div>
          </div>
        ))}
      </div>

      <div
        className="rounded-xl border-2 border-dashed p-4 text-sm text-[var(--muted)] bg-[var(--card)]"
        style={{ borderColor: "var(--brand-blue)" }}
      >
        لمتابعة تفاصيل المراقبين وتعيين مكاتب التصويت، انتقل إلى صفحة{" "}
        <a href="/observers" className="text-[var(--brand-blue)] font-bold underline">
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
      className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4 shadow-[3px_4px_0_rgba(43,36,23,0.08)]"
      style={borderColor ? { borderTop: `3px solid ${borderColor}` } : undefined}
    >
      <div className="text-2xl font-extrabold">{value}</div>
      <div className="text-sm text-[var(--muted)] font-medium">{label}</div>
    </div>
  );
}
