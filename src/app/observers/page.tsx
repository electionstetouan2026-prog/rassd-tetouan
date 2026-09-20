import PageShell from "@/components/PageShell";
import { createClient } from "@/lib/supabase/server";
import { addObserver, assignStation, updateObserverStatus, updateObserverInfo } from "./actions";
import { IconPeople } from "@/components/icons";
import StationCombobox from "@/components/StationCombobox";
import ListSearch from "@/components/ListSearch";
import { getDictionary } from "@/lib/i18n/getDictionary";

export const dynamic = "force-dynamic";

const STATUS_COLOR: Record<string, string> = {
  "مؤكد": "var(--severity-neutral)",
  "غير مؤكد": "var(--severity-medium)",
  "غايب": "var(--severity-high)",
  "لم يُعيّن": "var(--severity-pending)",
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

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "؟";
  if (parts.length === 1) return parts[0].slice(0, 1);
  return `${parts[0].slice(0, 1)}${parts[1].slice(0, 1)}`;
}

export default async function ObserversPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; commune?: string }>;
}) {
  const params = await searchParams;
  const statusFilter = params.status ?? "all";
  const communeFilter = params.commune ?? "all";

  const { dict, locale } = await getDictionary();
  const STATUS_LABEL: Record<string, string> = {
    "مؤكد": dict.common.status.confirmed,
    "غير مؤكد": dict.common.status.unconfirmed,
    "غايب": dict.common.status.absent,
    "لم يُعيّن": dict.common.status.unassigned,
  };

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
  const rawCoveragePct = totalStations > 0 ? (coveredStations / totalStations) * 100 : 0;
  // نعرض "أقل من 1%" بدل "0%" لما تكون التغطية موجودة فعلاً لكن صغيرة جداً،
  // باش ماتبانش الأرقام متضاربة (مثلاً "1 من 594 (0%)")
  const coveragePctLabel =
    coveredStations > 0 && rawCoveragePct < 1 ? dict.observers.underOnePercent : `${Math.round(rawCoveragePct)}%`;

  return (
    <PageShell
      title={dict.observers.title}
      subtitle={dict.observers.subtitle}
      icon={<IconPeople />}
    >
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 mb-6 flex items-center justify-between flex-wrap gap-4 shadow-sm">
        <div>
          <div className="text-sm font-bold text-[var(--muted)]">{dict.observers.coverageLabel}</div>
          <div className="text-[28px] font-extrabold text-[var(--heading)]">
            {coveredStations} {dict.observers.coverageOf} {totalStations} {dict.observers.stationsUnit} ({coveragePctLabel})
          </div>
        </div>
        <div className="text-sm text-[var(--muted)] max-w-md leading-relaxed">
          {dict.observers.coverageNote}
        </div>
      </div>

      <section className="mb-8 rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm">
        <h2 className="text-lg font-extrabold mb-4 text-[var(--heading)]">{dict.observers.addObserverTitle}</h2>
        <form action={addObserver} className="grid grid-cols-2 gap-3 mb-2">
          <input
            name="full_name"
            placeholder={dict.observers.fullNamePlaceholder}
            required
            className="rounded-lg border border-[var(--border)] px-3.5 py-2.5 text-[15px] bg-[var(--bg)] focus:border-[var(--brand-blue)] focus:outline-none"
          />
          <input
            name="phone"
            placeholder={dict.observers.phonePlaceholder}
            className="rounded-lg border border-[var(--border)] px-3.5 py-2.5 text-[15px] bg-[var(--bg)] focus:border-[var(--brand-blue)] focus:outline-none"
          />
          <StationCombobox
            name="polling_station_id"
            placeholder={dict.observers.noStationPlaceholder}
            className="col-span-2"
            dict={dict}
          />
          <input
            name="notes"
            placeholder={dict.observers.notesPlaceholder}
            className="col-span-2 rounded-lg border border-[var(--border)] px-3.5 py-2.5 text-[15px] bg-[var(--bg)] focus:border-[var(--brand-blue)] focus:outline-none"
          />
          <button className="col-span-2 rounded-lg bg-[var(--brand-blue)] text-white font-bold px-4 py-2.5 hover:bg-[var(--brand-blue-hover)] transition">
            {dict.observers.addObserverButton}
          </button>
        </form>
      </section>

      <div className="flex gap-2 flex-wrap mb-3">
        {STATUS_TABS.map((tab) => (
          <a
            key={tab}
            href={`/observers?status=${tab}&commune=${communeFilter}`}
            className={`text-sm rounded-full px-4 py-2 border font-bold shadow-sm ${
              statusFilter === tab
                ? "bg-[var(--brand-blue)] text-white border-[var(--brand-blue)]"
                : "border-[var(--border)] bg-[var(--card)] text-[var(--text)]"
            }`}
          >
            {tab === "all" ? dict.common.all : STATUS_LABEL[tab]} ({statusCounts[tab] ?? 0})
          </a>
        ))}
      </div>
      <div className="flex gap-2 flex-wrap mb-6">
        <a
          href={`/observers?status=${statusFilter}&commune=all`}
          className={`text-sm rounded-full px-3.5 py-1.5 border font-semibold ${
            communeFilter === "all"
              ? "bg-[var(--brand-navy)] text-white border-[var(--brand-navy)]"
              : "border-[var(--border)] text-[var(--muted)] bg-[var(--card)]"
          }`}
        >
          {dict.observers.allCommunes}
        </a>
        {(communes ?? []).map((c) => (
          <a
            key={c.id}
            href={`/observers?status=${statusFilter}&commune=${encodeURIComponent(c.name)}`}
            className={`text-sm rounded-full px-3.5 py-1.5 border font-semibold ${
              communeFilter === c.name
                ? "bg-[var(--brand-navy)] text-white border-[var(--brand-navy)]"
                : "border-[var(--border)] text-[var(--muted)] bg-[var(--card)]"
            }`}
          >
            {c.name}
          </a>
        ))}
      </div>

      <ListSearch scopeId="observers-list" placeholder={dict.observers.searchPlaceholder} dict={dict} locale={locale} />
      <div id="observers-list" className="grid md:grid-cols-2 gap-4">
        {filteredObservers.map((o: any) => (
          <div key={o.id} data-search-item className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm">
            <div className="flex items-start gap-3 mb-3">
              <div
                className="w-11 h-11 rounded-full flex items-center justify-center text-[14px] font-extrabold text-white shrink-0"
                style={{ background: STATUS_COLOR[o.confirmation_status] }}
              >
                {initials(o.full_name)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-extrabold text-[16px] text-[var(--heading)]">{o.full_name}</div>
                {o.phone && <div className="text-sm text-[var(--muted)] mt-0.5">{o.phone}</div>}
              </div>
              <span
                className="text-xs font-extrabold rounded-full px-3 py-1.5 text-white shrink-0"
                style={{ background: STATUS_COLOR[o.confirmation_status] }}
              >
                {STATUS_LABEL[o.confirmation_status] ?? o.confirmation_status}
              </span>
            </div>
            <div className="text-sm text-[var(--muted)] mb-2 leading-relaxed">
              {o.polling_stations
                ? <><b className="text-[var(--text)]">{o.polling_stations.communes?.name ?? "?"}</b> — {o.polling_stations.center_name}
                    {o.polling_stations.sub_office_number ? ` (${dict.observers.subOfficePrefix} ${o.polling_stations.sub_office_number})` : ""}
                  </>
                : dict.observers.noStationAssigned}
            </div>
            {o.notes && <p className="text-sm text-[var(--muted)] mb-2">{o.notes}</p>}

            <details className="mb-2">
              <summary className="cursor-pointer text-xs font-bold text-[var(--brand-blue)]">
                {dict.observers.editInfoSummary}
              </summary>
              <form action={updateObserverInfo.bind(null, o.id)} className="grid grid-cols-2 gap-2 mt-2">
                <input
                  name="full_name"
                  defaultValue={o.full_name}
                  required
                  placeholder={dict.observers.fullNamePlaceholder}
                  className="col-span-2 rounded-lg border border-[var(--border)] px-2.5 py-1.5 text-sm bg-[var(--bg)]"
                />
                <input
                  name="phone"
                  defaultValue={o.phone ?? ""}
                  placeholder={dict.observers.phonePlaceholder}
                  className="rounded-lg border border-[var(--border)] px-2.5 py-1.5 text-sm bg-[var(--bg)]"
                />
                <input
                  name="notes"
                  defaultValue={o.notes ?? ""}
                  placeholder={dict.observers.notesPlaceholder}
                  className="rounded-lg border border-[var(--border)] px-2.5 py-1.5 text-sm bg-[var(--bg)]"
                />
                <button className="col-span-2 rounded-lg bg-[var(--brand-blue)] text-white font-bold px-3.5 py-1.5 text-sm hover:bg-[var(--brand-blue-hover)] transition">
                  {dict.common.save}
                </button>
              </form>
            </details>

            <div className="flex gap-2 flex-wrap items-center pt-3 border-t border-[var(--border)] mt-3">
              {STATUS_TABS.filter((s) => s !== "all").map((s) => (
                <form key={s} action={updateObserverStatus.bind(null, o.id, s)}>
                  <button
                    className={`text-xs font-bold rounded-full px-3 py-1.5 border ${
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
                  {dict.observers.lastUpdatePrefix} {new Date(o.last_checked_at).toLocaleString(locale === "fr" ? "fr-FR" : "ar-MA")}
                </span>
              )}
            </div>
            <form action={assignStation.bind(null, o.id)} className="flex gap-2 mt-3">
              <StationCombobox
                name="polling_station_id"
                defaultValue={o.polling_station_id ?? ""}
                defaultLabel={
                  o.polling_stations
                    ? `${o.polling_stations.communes?.name ?? "?"} — ${o.polling_stations.center_name}${
                        o.polling_stations.sub_office_number
                          ? ` (${dict.observers.subOfficePrefix} ${o.polling_stations.sub_office_number})`
                          : ""
                      }`
                    : ""
                }
                placeholder={dict.observers.reassignPlaceholder}
                className="flex-1"
                dict={dict}
              />
              <button className="text-sm font-bold rounded-lg border border-[var(--border)] px-3.5 py-1.5">
                {dict.observers.changeStationButton}
              </button>
            </form>
          </div>
        ))}
        {filteredObservers.length === 0 && (
          <p className="text-[15px] text-[var(--muted)] md:col-span-2">{dict.observers.noMatch}</p>
        )}
      </div>
    </PageShell>
  );
}
