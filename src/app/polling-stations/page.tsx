import PageShell from "@/components/PageShell";
import { createClient } from "@/lib/supabase/server";
import { updatePollingStationLocation } from "./actions";
import { IconBuilding } from "@/components/icons";
import ListSearch from "@/components/ListSearch";
import { getDictionary } from "@/lib/i18n/getDictionary";

export const dynamic = "force-dynamic";

const LOCATION_TABS = ["مؤكد", "يحتاج تأكيد", "غير محدد"];
const LOCATION_COLOR: Record<string, string> = {
  "مؤكد": "var(--severity-neutral)",
  "يحتاج تأكيد": "var(--severity-medium)",
  "غير محدد": "#9ca3af",
};

type Station = {
  id: string;
  commune_id: string;
  center_name: string;
  sub_office_number: number | null;
  approx_zone: string | null;
  coordinates: string | null;
  map_link: string | null;
  location_confirmed: string;
};

// كيجمع مكاتب التصويت حسب المدرسة (center_name) باش نعرضو المدرسة
// كواحدة قابلة للفتح، وفداخلها كل المكاتب التابعة ليها
function groupBySchool(stations: Station[]): { name: string; stations: Station[] }[] {
  const map = new Map<string, Station[]>();
  for (const s of stations) {
    const key = s.center_name.trim();
    const arr = map.get(key) ?? [];
    arr.push(s);
    map.set(key, arr);
  }
  return Array.from(map.entries())
    .map(([name, stations]) => ({
      name,
      stations: stations.sort((a, b) => (a.sub_office_number ?? 0) - (b.sub_office_number ?? 0)),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "ar"));
}

export default async function PollingStationsPage({
  searchParams,
}: {
  searchParams: Promise<{ commune?: string; location?: string }>;
}) {
  const params = await searchParams;
  const communeFilter = params.commune ?? "all";
  const locationFilter = params.location ?? "all";

  const { dict, locale } = await getDictionary();
  const numberLocale = locale === "fr" ? "fr-FR" : "ar";
  const LOCATION_LABEL: Record<string, string> = {
    "مؤكد": dict.common.status.confirmed,
    "يحتاج تأكيد": dict.pollingStations.locationNeedsConfirmation,
    "غير محدد": dict.pollingStations.locationUndefined,
  };

  const supabase = await createClient();

  const [{ data: communesRaw }, { data: stationsRaw }, { data: voterCountsRaw }, { data: observersRaw }] =
    await Promise.all([
      supabase.from("communes").select("id, name, type").order("name"),
      supabase
        .from("polling_stations")
        .select("id, commune_id, center_name, sub_office_number, approx_zone, coordinates, map_link, location_confirmed")
        .eq("is_mock", false)
        .order("sub_office_number"),
      supabase.from("voters_by_polling_station").select("polling_station_id, voter_count"),
      supabase.from("observers").select("polling_station_id, confirmation_status"),
    ]);

  const communes = communesRaw ?? [];
  const stations = (stationsRaw ?? []) as Station[];
  const voterCounts = new Map((voterCountsRaw ?? []).map((r) => [r.polling_station_id as string, r.voter_count as number]));
  const confirmedObserverStations = new Set(
    (observersRaw ?? [])
      .filter((o) => o.confirmation_status === "مؤكد" && o.polling_station_id)
      .map((o) => o.polling_station_id as string)
  );

  const stationsByCommune = new Map<string, Station[]>();
  for (const s of stations) {
    const list = stationsByCommune.get(s.commune_id) ?? [];
    list.push(s);
    stationsByCommune.set(s.commune_id, list);
  }

  const locationCounts: Record<string, number> = { all: stations.length };
  for (const t of LOCATION_TABS) locationCounts[t] = 0;
  for (const s of stations) locationCounts[s.location_confirmed] = (locationCounts[s.location_confirmed] ?? 0) + 1;

  const filteredCommunes = communes.filter((c) => communeFilter === "all" || c.id === communeFilter);

  return (
    <PageShell
      title={dict.pollingStations.title}
      subtitle={dict.pollingStations.subtitle}
      icon={<IconBuilding />}
    >
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 mb-6 flex items-center gap-6 flex-wrap shadow-sm">
        <div>
          <div className="text-sm font-bold text-[var(--muted)]">{dict.pollingStations.totalStations}</div>
          <div className="text-[28px] font-extrabold text-[var(--heading)]">{stations.length.toLocaleString(numberLocale)}</div>
        </div>
        <div>
          <div className="text-sm font-bold text-[var(--muted)]">{dict.pollingStations.confirmedLocations}</div>
          <div className="text-[28px] font-extrabold" style={{ color: "var(--severity-neutral)" }}>
            {locationCounts["مؤكد"] ?? 0}
          </div>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap mb-3">
        {["all", ...LOCATION_TABS].map((t) => (
          <a
            key={t}
            href={`/polling-stations?commune=${communeFilter}&location=${t}`}
            className={`text-sm rounded-full px-4 py-2 border font-bold shadow-sm ${
              locationFilter === t
                ? "bg-[var(--brand-blue)] text-white border-[var(--brand-blue)]"
                : "border-[var(--border)] bg-[var(--card)] text-[var(--text)]"
            }`}
          >
            {t === "all" ? dict.common.all : LOCATION_LABEL[t]} ({locationCounts[t] ?? 0})
          </a>
        ))}
      </div>
      <div className="flex gap-2 flex-wrap mb-6">
        <a
          href={`/polling-stations?commune=all&location=${locationFilter}`}
          className={`text-sm rounded-full px-3.5 py-1.5 border font-semibold ${
            communeFilter === "all"
              ? "bg-[var(--brand-navy)] text-white border-[var(--brand-navy)]"
              : "border-[var(--border)] text-[var(--muted)] bg-[var(--card)]"
          }`}
        >
          {dict.pollingStations.allCommunes}
        </a>
        {communes.map((c) => (
          <a
            key={c.id}
            href={`/polling-stations?commune=${c.id}&location=${locationFilter}`}
            className={`text-sm rounded-full px-3.5 py-1.5 border font-semibold ${
              communeFilter === c.id
                ? "bg-[var(--brand-navy)] text-white border-[var(--brand-navy)]"
                : "border-[var(--border)] text-[var(--muted)] bg-[var(--card)]"
            }`}
          >
            {c.name}
          </a>
        ))}
      </div>

      <ListSearch scopeId="polling-stations-list" placeholder={dict.pollingStations.searchPlaceholder} dict={dict} locale={locale} />
      <div id="polling-stations-list" className="space-y-4">
        {filteredCommunes.map((c) => {
          const communeStations = (stationsByCommune.get(c.id) ?? []).filter(
            (s) => locationFilter === "all" || s.location_confirmed === locationFilter
          );
          if (communeStations.length === 0) return null;
          return (
            <details key={c.id} data-search-group className="rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-sm overflow-hidden">
              <summary className="cursor-pointer flex items-center justify-between flex-wrap gap-3 p-5 list-none">
                <span className="font-extrabold text-[17px] text-[var(--heading)]">{c.name}</span>
                <span className="text-sm text-[var(--muted)]">{communeStations.length} {dict.pollingStations.stationsUnit}</span>
              </summary>
              <div className="px-5 pb-5 space-y-2 border-t border-[var(--border)] pt-4">
                {groupBySchool(communeStations).map((school) => {
                  const schoolTotalVoters = school.stations.reduce((sum, s) => sum + (voterCounts.get(s.id) ?? 0), 0);
                  const schoolCoveredVoters = school.stations
                    .filter((s) => confirmedObserverStations.has(s.id))
                    .reduce((sum, s) => sum + (voterCounts.get(s.id) ?? 0), 0);
                  const schoolCoveragePct = schoolTotalVoters > 0 ? Math.round((schoolCoveredVoters / schoolTotalVoters) * 100) : 0;
                  return (
                    <details key={school.name} data-search-group className="rounded-lg border border-[var(--border)] bg-[var(--bg)]">
                      <summary className="cursor-pointer flex items-center justify-between gap-3 p-3.5 list-none flex-wrap">
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className="font-extrabold text-[var(--heading)]">{school.name}</span>
                          <span className="text-sm text-[var(--muted)]">{school.stations.length} {dict.pollingStations.stationsUnit}</span>
                          <span className="text-sm text-[var(--muted)]">
                            {schoolTotalVoters.toLocaleString(numberLocale)} {dict.pollingStations.totalVotersSuffix}
                          </span>
                        </div>
                        <span
                          className="text-xs font-extrabold rounded-full px-3 py-1.5 text-white shrink-0"
                          style={{ background: schoolCoveredVoters > 0 ? "var(--severity-neutral)" : "#9ca3af" }}
                        >
                          {schoolCoveredVoters.toLocaleString(numberLocale)} {dict.pollingStations.votersCoveredSuffix} ({schoolCoveragePct}%)
                        </span>
                      </summary>
                      <div className="px-3.5 pb-3.5 space-y-2">
                        {school.stations.map((s) => (
                  <details key={s.id} data-search-item className="rounded-lg border border-[var(--border)] bg-[var(--bg)]">
                    <summary className="cursor-pointer flex items-center justify-between gap-3 p-3.5 list-none">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="font-bold text-[var(--text)]">
                          {s.sub_office_number ? `${dict.pollingStations.officePrefix} ${s.sub_office_number} — ` : ""}
                          {s.center_name}
                        </span>
                        {s.approx_zone && <span className="text-sm text-[var(--muted)]">({s.approx_zone})</span>}
                        <span className="text-sm text-[var(--muted)]">
                          {(voterCounts.get(s.id) ?? 0).toLocaleString(numberLocale)} {dict.pollingStations.votersUnit}
                        </span>
                        {confirmedObserverStations.has(s.id) && (
                          <span
                            className="text-xs font-extrabold rounded-full px-2.5 py-1 text-white"
                            style={{ background: "var(--severity-neutral)" }}
                          >
                            {dict.pollingStations.confirmedObserverBadge}
                          </span>
                        )}
                      </div>
                      <span
                        className="text-xs font-extrabold rounded-full px-3 py-1.5 text-white shrink-0"
                        style={{ background: LOCATION_COLOR[s.location_confirmed] ?? "#9ca3af" }}
                      >
                        {LOCATION_LABEL[s.location_confirmed] ?? s.location_confirmed}
                      </span>
                    </summary>
                    <form
                      action={updatePollingStationLocation.bind(null, s.id)}
                      className="px-3.5 pb-3.5 grid grid-cols-2 md:grid-cols-4 gap-2 text-sm"
                    >
                      <input
                        name="approx_zone"
                        defaultValue={s.approx_zone ?? ""}
                        placeholder={dict.pollingStations.approxZonePlaceholder}
                        className="rounded-lg border border-[var(--border)] px-2.5 py-1.5 bg-[var(--card)]"
                      />
                      <input
                        name="coordinates"
                        defaultValue={s.coordinates ?? ""}
                        placeholder={dict.pollingStations.coordinatesPlaceholder}
                        className="rounded-lg border border-[var(--border)] px-2.5 py-1.5 bg-[var(--card)]"
                      />
                      <input
                        name="map_link"
                        defaultValue={s.map_link ?? ""}
                        placeholder={dict.pollingStations.mapLinkPlaceholder}
                        className="rounded-lg border border-[var(--border)] px-2.5 py-1.5 bg-[var(--card)]"
                      />
                      <select
                        name="location_confirmed"
                        defaultValue={s.location_confirmed}
                        className="rounded-lg border border-[var(--border)] px-2.5 py-1.5 bg-[var(--card)]"
                      >
                        {LOCATION_TABS.map((t) => (
                          <option key={t} value={t}>
                            {LOCATION_LABEL[t]}
                          </option>
                        ))}
                      </select>
                      <button className="col-span-2 md:col-span-4 rounded-lg bg-[var(--brand-navy)] text-white font-bold px-3.5 py-2 text-sm">
                        {dict.common.save}
                      </button>
                    </form>
                    {s.map_link && (
                      <div className="px-3.5 pb-3.5">
                        <a href={s.map_link} target="_blank" rel="noopener noreferrer" className="text-sm text-[var(--brand-blue)] font-bold underline">
                          {dict.pollingStations.openMapLink}
                        </a>
                      </div>
                    )}
                  </details>
                ))}
                      </div>
                    </details>
                  );
                })}
              </div>
            </details>
          );
        })}
      </div>
    </PageShell>
  );
}
