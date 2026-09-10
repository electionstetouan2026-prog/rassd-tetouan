import PageShell from "@/components/PageShell";
import { createClient } from "@/lib/supabase/server";
import { addObserver, assignStation, updateObserverStatus } from "./actions";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  "مؤكد": "مؤكد",
  "غير مؤكد": "غير مؤكد",
  "غايب": "غايب",
  "لم يُعيّن": "لم يُعيّن",
};
const STATUS_COLOR: Record<string, string> = {
  "مؤكد": "#16a34a",
  "غير مؤكد": "#ca8a04",
  "غايب": "#dc2626",
  "لم يُعيّن": "#6b7280",
};
const STATUS_TABS = ["all", "مؤكد", "غير مؤكد", "غايب", "لم يُعيّن"];

type PollingStation = {
  id: string;
  center_name: string;
  sub_office_number: number | null;
  approx_zone: string | null;
  is_mock: boolean;
  commune_id: string;
  communes: { name: string } | null;
};

export default async function ObserversPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; commune?: string }>;
}) {
  const params = await searchParams;
  const statusFilter = params.status ?? "all";
  const communeFilter = params.commune ?? "all";

  const supabase = await createClient();

  const [{ data: communes }, { data: stations }, { data: observersRaw }] = await Promise.all([
    supabase.from("communes").select("id, name, type, has_detailed_station_data").order("name"),
    supabase
      .from("polling_stations")
      .select("id, center_name, sub_office_number, approx_zone, is_mock, commune_id, communes(name)")
      .order("center_name"),
    supabase
      .from("observers")
      .select(
        "id, full_name, phone, confirmation_status, last_checked_at, notes, polling_station_id, polling_stations(id, center_name, sub_office_number, communes(name))"
      )
      .order("created_at", { ascending: false }),
  ]);

  const allStations = (stations ?? []) as unknown as PollingStation[];
  const observers = observersRaw ?? [];

  const filteredObservers = observers.filter((o: any) => {
    const stationCommune = o.polling_stations?.communes?.name;
    return (
      (statusFilter === "all" || o.confirmation_status === statusFilter) &&
      (communeFilter === "all" || stationCommune === communeFilter)
    );
  });

  const statusCounts: Record<string, number> = { all: observers.length };
  for (const s of STATUS_TABS) if (s !== "all") statusCounts[s] = 0;
  for (const o of observers) statusCounts[o.confirmation_status] = (statusCounts[o.confirmation_status] ?? 0) + 1;

  // مؤشر التغطية: عدد مكاتب التصويت اللي عندها مراقب واحد على الأقل بحالة "مؤكد"
  const confirmedStationIds = new Set(
    observers.filter((o: any) => o.confirmation_status === "مؤكد" && o.polling_station_id).map((o: any) => o.polling_station_id)
  );
  const totalStations = allStations.length;
  const coveredStations = confirmedStationIds.size;
  const coveragePct = totalStations > 0 ? Math.round((coveredStations / totalStations) * 100) : 0;

  return (
    <PageShell title="جرد المراقبين">
      <p className="text-sm text-[var(--muted)] mb-4">
        جرد المراقبين وحالة إسنادهم لمكاتب التصويت، مع متابعة يومية لحالة كل مكتب
      </p>

      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 mb-6 flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="text-sm text-[var(--muted)]">التغطية المؤكدة</div>
          <div className="text-2xl font-bold text-[var(--brand-navy)]">
            {coveredStations} من {totalStations} مكتب ({coveragePct}%)
          </div>
        </div>
        <div className="text-xs text-[var(--muted)] max-w-md">
          مكتب "مغطى" = عندو مراقب واحد على الأقل بحالة تأكيد "مؤكد". المكاتب المعلّمة
          "بيانات افتراضية" ماشي حقيقية بعد — راجع claude/HANDOFF_T057_T058_OBSERVERS.md
        </div>
      </div>

      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-3">إضافة مراقب</h2>
        <form action={addObserver} className="grid grid-cols-2 gap-2 mb-2">
          <input
            name="full_name"
            placeholder="الاسم الكامل"
            required
            className="rounded-lg border border-[var(--border)] px-3 py-2 bg-[var(--card)]"
          />
          <input
            name="phone"
            placeholder="الهاتف (اختياري)"
            className="rounded-lg border border-[var(--border)] px-3 py-2 bg-[var(--card)]"
          />
          <select
            name="polling_station_id"
            defaultValue=""
            className="col-span-2 rounded-lg border border-[var(--border)] px-3 py-2 bg-[var(--card)]"
          >
            <option value="">— بلا إسناد مكتب دابا —</option>
            {allStations.map((s) => (
              <option key={s.id} value={s.id}>
                {s.communes?.name ?? "?"} — {s.center_name}
                {s.sub_office_number ? ` (فرعي ${s.sub_office_number})` : ""}
                {s.is_mock ? " · افتراضي" : ""}
              </option>
            ))}
          </select>
          <input
            name="notes"
            placeholder="ملاحظة (اختياري)"
            className="col-span-2 rounded-lg border border-[var(--border)] px-3 py-2 bg-[var(--card)]"
          />
          <button className="col-span-2 rounded-lg bg-[var(--brand-blue)] text-white px-4 py-2">
            إضافة مراقب
          </button>
        </form>
      </section>

      <div className="flex gap-2 flex-wrap mb-3">
        {STATUS_TABS.map((tab) => (
          <a
            key={tab}
            href={`/observers?status=${tab}&commune=${communeFilter}`}
            className={`text-sm rounded-full px-3 py-1 border ${
              statusFilter === tab
                ? "bg-[var(--brand-blue)] text-white border-[var(--brand-blue)]"
                : "border-[var(--border)]"
            }`}
          >
            {tab === "all" ? "الكل" : STATUS_LABEL[tab]} ({statusCounts[tab] ?? 0})
          </a>
        ))}
      </div>
      <div className="flex gap-2 flex-wrap mb-6">
        <a
          href={`/observers?status=${statusFilter}&commune=all`}
          className={`text-xs rounded-full px-3 py-1 border ${
            communeFilter === "all"
              ? "bg-[var(--brand-navy)] text-white border-[var(--brand-navy)]"
              : "border-[var(--border)] text-[var(--muted)]"
          }`}
        >
          كل الجماعات
        </a>
        {(communes ?? []).map((c) => (
          <a
            key={c.id}
            href={`/observers?status=${statusFilter}&commune=${encodeURIComponent(c.name)}`}
            className={`text-xs rounded-full px-3 py-1 border ${
              communeFilter === c.name
                ? "bg-[var(--brand-navy)] text-white border-[var(--brand-navy)]"
                : "border-[var(--border)] text-[var(--muted)]"
            }`}
          >
            {c.name}
          </a>
        ))}
      </div>

      <div className="space-y-3">
        {filteredObservers.map((o: any) => (
          <div key={o.id} className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
            <div className="flex justify-between items-start gap-3 mb-2 flex-wrap">
              <div>
                <div className="font-medium">{o.full_name}</div>
                {o.phone && <div className="text-xs text-[var(--muted)]">{o.phone}</div>}
                <div className="text-xs text-[var(--muted)] mt-1">
                  {o.polling_stations
                    ? `${o.polling_stations.communes?.name ?? "?"} — ${o.polling_stations.center_name}${
                        o.polling_stations.sub_office_number ? ` (فرعي ${o.polling_stations.sub_office_number})` : ""
                      }`
                    : "بلا مكتب مسند"}
                </div>
              </div>
              <span
                className="text-xs rounded-full px-2 py-0.5 text-white shrink-0"
                style={{ background: STATUS_COLOR[o.confirmation_status] }}
              >
                {STATUS_LABEL[o.confirmation_status] ?? o.confirmation_status}
              </span>
            </div>
            {o.notes && <p className="text-sm text-[var(--muted)] mb-2">{o.notes}</p>}
            <div className="flex gap-2 flex-wrap items-center">
              {STATUS_TABS.filter((s) => s !== "all").map((s) => (
                <form key={s} action={updateObserverStatus.bind(null, o.id, s)}>
                  <button
                    className={`text-xs rounded-full px-3 py-1 border ${
                      o.confirmation_status === s
                        ? "border-transparent text-white"
                        : "border-[var(--border)] text-[var(--muted)]"
                    }`}
                    style={o.confirmation_status === s ? { background: STATUS_COLOR[s] } : undefined}
                  >
                    {STATUS_LABEL[s]}
                  </button>
                </form>
              ))}
              {o.last_checked_at && (
                <span className="text-xs text-[var(--muted)]">
                  آخر تحديث: {new Date(o.last_checked_at).toLocaleString("ar-MA")}
                </span>
              )}
            </div>
            <form action={assignStation.bind(null, o.id)} className="flex gap-2 mt-3">
              <select
                name="polling_station_id"
                defaultValue={o.polling_station_id ?? ""}
                className="flex-1 rounded-lg border border-[var(--border)] px-2 py-1 text-sm bg-[var(--card)]"
              >
                <option value="">— بلا إسناد —</option>
                {allStations.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.communes?.name ?? "?"} — {s.center_name}
                    {s.sub_office_number ? ` (فرعي ${s.sub_office_number})` : ""}
                    {s.is_mock ? " · افتراضي" : ""}
                  </option>
                ))}
              </select>
              <button className="text-xs rounded-lg border border-[var(--border)] px-3 py-1">
                تغيير المكتب
              </button>
            </form>
          </div>
        ))}
        {filteredObservers.length === 0 && (
          <p className="text-sm text-[var(--muted)]">ماكاينش مراقبون يطابقو هاد الفلترة.</p>
        )}
      </div>
    </PageShell>
  );
}
