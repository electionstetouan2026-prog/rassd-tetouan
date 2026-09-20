import PageShell from "@/components/PageShell";
import { createClient } from "@/lib/supabase/server";
import { addZone, deleteZone, updateZone, addCell, deleteCell } from "./actions";
import { getCoverageData } from "@/lib/coverage";
import { IconMap } from "@/components/icons";
import ListSearch from "@/components/ListSearch";
import { getDictionary } from "@/lib/i18n/getDictionary";

export const dynamic = "force-dynamic";

const ZONE_TYPES = ["حي", "دوار", "مدشر"];

type Commune = {
  id: string;
  name: string;
  type: string;
  registered_voters_est: number | null;
  participation_rate_2021: number | null;
  seats_total_2021: number | null;
  districts_count_2021: number | null;
  total_votes_2021: number | null;
  leading_party_2021: string | null;
  leading_party_seats_2021: number | null;
  leading_party_pct_2021: number | null;
};

type Zone = {
  id: string;
  commune_id: string;
  name: string;
  zone_type: string;
  our_offices_count: number;
  our_presence_pct: number | null;
  party_1_name: string | null;
  party_1_offices: number | null;
  party_2_name: string | null;
  party_2_offices: number | null;
  party_3_name: string | null;
  party_3_offices: number | null;
  notes: string | null;
  updated_at: string;
};

type Cell = {
  id: string;
  zone_id: string;
  cell_name: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  established_date: string;
  notes: string | null;
};

type Locality = {
  id: string;
  commune_id: string;
  locality_name: string;
  voter_count: number;
};

// كتوقع كسر (0-1) — مستعملة لأعمدة خط الأساس 2021 (participation_rate_2021،
// leading_party_pct_2021) اللي مخزنة فالقاعدة كنسبة كسرية.
function pct(n: number | null) {
  if (n === null || n === undefined) return "—";
  return `${Math.round(n * 1000) / 10}%`;
}

// كتوقع نسبة مئوية جاهزة (0-100) — هوما هاكذا كيرجعو من coverage.ts
// (fieldCoveragePct/electionDayCoveragePct محسوبين بـ`* 100` من قبل).
// بق حقيقي اتكتشف (14 شتنبر 2026): استعمال pct() العادية هنا كان كيضاعف
// القسمة على 100 مرة زايدة (مثلا 1/594 = 0.168% كانت كتبان "16.8%").
function pctRaw(n: number | null) {
  if (n === null || n === undefined) return "—";
  return `${Math.round(n * 10) / 10}%`;
}

// commune_localities قد يفوق 1000 سطر، وإعداد db-max-rows الافتراضي فـ Supabase
// يحد كل طلب بـ1000 سطر بغض النظر عن .limit() فالكود. نجيبو البيانات دفعات
// دفعات (0-999، 1000-1999، ...) باش نضمنو رجوع كل الصفوف مهما كان العدد.
async function fetchAllLocalities(supabase: Awaited<ReturnType<typeof createClient>>) {
  const pageSize = 1000;
  const all: any[] = [];
  let from = 0;
  for (;;) {
    const { data, error } = await supabase
      .from("commune_localities")
      .select("id, commune_id, locality_name, voter_count")
      .order("voter_count", { ascending: false })
      .range(from, from + pageSize - 1);
    if (error || !data) break;
    all.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return all;
}

export default async function PresencePage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const params = await searchParams;
  const typeFilter = params.type ?? "all";

  const { dict, locale } = await getDictionary();
  const numberLocale = locale === "fr" ? "fr-FR" : "ar";
  const COMMUNE_TYPE_LABEL: Record<string, string> = {
    "حضري": dict.presence.urban,
    "قروي": dict.presence.rural,
  };
  const ZONE_TYPE_LABEL: Record<string, string> = {
    "حي": dict.presence.zoneTypeHay,
    "دوار": dict.presence.zoneTypeDouar,
    "مدشر": dict.presence.zoneTypeMachar,
  };

  const supabase = await createClient();

  const [{ data: communesRaw }, { data: zonesRaw }, { data: cellsRaw }, localitiesRaw, coverage] =
    await Promise.all([
      supabase
        .from("communes")
        .select(
          "id, name, type, registered_voters_est, participation_rate_2021, seats_total_2021, districts_count_2021, total_votes_2021, leading_party_2021, leading_party_seats_2021, leading_party_pct_2021"
        )
        .order("name"),
      supabase
        .from("commune_zones")
        .select(
          "id, commune_id, name, zone_type, our_offices_count, our_presence_pct, party_1_name, party_1_offices, party_2_name, party_2_offices, party_3_name, party_3_offices, notes, updated_at"
        )
        .order("name"),
      supabase
        .from("zone_cells")
        .select("id, zone_id, cell_name, contact_name, contact_phone, established_date, notes")
        .order("established_date", { ascending: false }),
      fetchAllLocalities(supabase),
      getCoverageData(supabase),
    ]);

  const communes = (communesRaw ?? []) as Commune[];
  const zones = (zonesRaw ?? []) as Zone[];
  const cells = (cellsRaw ?? []) as Cell[];
  const localities = (localitiesRaw ?? []) as Locality[];

  const zonesByCommune = new Map<string, Zone[]>();
  for (const z of zones) {
    const list = zonesByCommune.get(z.commune_id) ?? [];
    list.push(z);
    zonesByCommune.set(z.commune_id, list);
  }

  const cellsByZone = new Map<string, Cell[]>();
  for (const cell of cells) {
    const list = cellsByZone.get(cell.zone_id) ?? [];
    list.push(cell);
    cellsByZone.set(cell.zone_id, list);
  }

  const localitiesByCommune = new Map<string, Locality[]>();
  for (const l of localities) {
    const list = localitiesByCommune.get(l.commune_id) ?? [];
    list.push(l);
    localitiesByCommune.set(l.commune_id, list);
  }
  const totalLocalitiesVoters = localities.reduce((s, l) => s + (l.voter_count ?? 0), 0);

  const filteredCommunes = communes.filter((c) => typeFilter === "all" || c.type === typeFilter);

  const totalZones = zones.length;
  const totalOurOffices = zones.reduce((sum, z) => sum + (z.our_offices_count ?? 0), 0);
  const communesWithZones = new Set(zones.map((z) => z.commune_id)).size;

  return (
    <PageShell
      title={dict.presence.title}
      subtitle={dict.presence.subtitle}
      icon={<IconMap />}
    >
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-6 py-4 shadow-sm">
          <div className="text-2xl font-extrabold text-[var(--heading)]">{totalZones}</div>
          <div className="text-sm font-bold text-[var(--muted)]">{dict.presence.statZonesEntered}</div>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-6 py-4 shadow-sm">
          <div className="text-2xl font-extrabold text-[var(--heading)]">
            {communesWithZones} {dict.presence.of} {communes.length}
          </div>
          <div className="text-sm font-bold text-[var(--muted)]">{dict.presence.statCommunesWithData}</div>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-6 py-4 shadow-sm">
          <div className="text-2xl font-extrabold text-[var(--heading)]">{totalOurOffices}</div>
          <div className="text-sm font-bold text-[var(--muted)]">{dict.presence.statTotalOffices}</div>
        </div>
        <div
          className="rounded-xl border px-6 py-4 shadow-sm"
          style={{ borderColor: "var(--brand-blue)", background: "var(--card)" }}
        >
          <div className="text-2xl font-extrabold" style={{ color: "var(--brand-blue)" }}>
            {pctRaw(coverage.overall.fieldCoveragePct)}
          </div>
          <div className="text-sm font-bold text-[var(--muted)]">
            {dict.presence.fieldCoverageLabel} {coverage.overall.zonesWithCells}/{coverage.overall.totalZones} {dict.presence.zonesUnit}
          </div>
        </div>
        <div
          className="rounded-xl border px-6 py-4 shadow-sm"
          style={{ borderColor: "var(--severity-neutral)", background: "var(--card)" }}
        >
          <div className="text-2xl font-extrabold" style={{ color: "var(--severity-neutral)" }}>
            {pctRaw(coverage.overall.electionDayCoveragePct)}
          </div>
          <div className="text-sm font-bold text-[var(--muted)]">
            {dict.presence.electionDayCoverageLabel} {coverage.overall.coveredStations}/{coverage.overall.totalStations} {dict.presence.stationUnit}
          </div>
        </div>
        <div
          className="rounded-xl border px-6 py-4 shadow-sm"
          style={{ borderColor: "var(--border)", background: "var(--card)" }}
        >
          <div className="text-2xl font-extrabold text-[var(--heading)]">{localities.length.toLocaleString(numberLocale)}</div>
          <div className="text-sm font-bold text-[var(--muted)]">
            {dict.presence.realLocalitiesSuffix} ({totalLocalitiesVoters.toLocaleString(numberLocale)} {dict.presence.votersCoveredSuffix})
          </div>
        </div>
        <div className="text-sm text-[var(--muted)] max-w-md self-center leading-relaxed">
          {dict.presence.explanationText}
        </div>
      </div>

      <div className="flex gap-2 flex-wrap mb-6">
        {["all", "حضري", "قروي"].map((t) => (
          <a
            key={t}
            href={`/presence?type=${t}`}
            className={`text-sm rounded-full px-4 py-2 border font-bold shadow-sm ${
              typeFilter === t
                ? "bg-[var(--brand-blue)] text-white border-[var(--brand-blue)]"
                : "border-[var(--border)] bg-[var(--card)] text-[var(--text)]"
            }`}
          >
            {t === "all" ? dict.presence.allCommunes : COMMUNE_TYPE_LABEL[t]} (
            {t === "all" ? communes.length : communes.filter((c) => c.type === t).length})
          </a>
        ))}
      </div>

      <ListSearch scopeId="presence-list" placeholder={dict.presence.searchPlaceholder} dict={dict} locale={locale} />
      <div id="presence-list" className="space-y-4">
        {filteredCommunes.map((c) => {
          const communeZones = zonesByCommune.get(c.id) ?? [];
          const communeOffices = communeZones.reduce((s, z) => s + (z.our_offices_count ?? 0), 0);
          const communeCoverage = coverage.byCommune.get(c.id);
          return (
            <details key={c.id} data-search-item className="rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-sm overflow-hidden">
              <summary className="cursor-pointer flex items-center justify-between flex-wrap gap-3 p-5 list-none">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="font-extrabold text-[17px] text-[var(--heading)]">{c.name}</span>
                  <span className="text-xs font-bold rounded-full px-2.5 py-1 border border-[var(--border)] text-[var(--muted)]">
                    {COMMUNE_TYPE_LABEL[c.type] ?? c.type}
                  </span>
                  <span className="text-sm text-[var(--muted)]">
                    {communeZones.length} {dict.presence.zonesUnit} · {communeOffices} {dict.presence.ourOfficesSuffix}
                  </span>
                  {communeCoverage && (
                    <span className="text-xs font-bold rounded-full px-2.5 py-1" style={{ background: "var(--bg)", color: "var(--brand-blue)" }}>
                      {dict.presence.fieldCoverageBadge} {pctRaw(communeCoverage.fieldCoveragePct)}
                    </span>
                  )}
                  {communeCoverage && (
                    <span className="text-xs font-bold rounded-full px-2.5 py-1" style={{ background: "var(--bg)", color: "var(--severity-neutral)" }}>
                      {dict.presence.electionCoverageBadge} {pctRaw(communeCoverage.electionDayCoveragePct)}
                    </span>
                  )}
                </div>
                <div className="text-sm text-[var(--muted)] flex gap-4 flex-wrap">
                  <span>{dict.presence.participation2021Label} <b className="text-[var(--text)]">{pct(c.participation_rate_2021)}</b></span>
                  <span>
                    {dict.presence.leadingParty2021Label} <b className="text-[var(--text)]">{c.leading_party_2021 ?? "—"}</b> ({pct(c.leading_party_pct_2021)}
                    ، {c.leading_party_seats_2021 ?? "—"}/{c.seats_total_2021 ?? "—"} {dict.presence.seatUnit})
                  </span>
                </div>
              </summary>

              <div className="px-5 pb-5 space-y-3 border-t border-[var(--border)] pt-4">
                {(localitiesByCommune.get(c.id)?.length ?? 0) > 0 && (
                  <details className="rounded-lg border border-[var(--border)] bg-[var(--bg)] p-4">
                    <summary className="cursor-pointer text-sm font-extrabold text-[var(--heading)]">
                      {dict.presence.realLocalitiesSectionTitle}{" "}
                      {localitiesByCommune.get(c.id)?.length} {dict.presence.localityUnit}
                    </summary>
                    <div className="mt-3 grid grid-cols-2 md:grid-cols-3 gap-2">
                      {(localitiesByCommune.get(c.id) ?? []).map((l) => (
                        <div
                          key={l.id}
                          className="flex items-center justify-between gap-2 text-sm rounded-lg bg-[var(--card)] border border-[var(--border)] px-3 py-2"
                        >
                          <span className="text-[var(--text)]">{l.locality_name}</span>
                          <span className="font-extrabold text-[var(--heading)]">
                            {l.voter_count.toLocaleString(numberLocale)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </details>
                )}
                {communeZones.map((z) => (
                  <div key={z.id} className="rounded-lg border border-[var(--border)] bg-[var(--bg)] p-4">
                    <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
                      <div className="font-extrabold text-[var(--heading)]">
                        {z.name} <span className="text-sm text-[var(--muted)] font-normal">({ZONE_TYPE_LABEL[z.zone_type] ?? z.zone_type})</span>
                      </div>
                      <form action={deleteZone.bind(null, z.id)}>
                        <button
                          className="text-xs font-bold rounded-full px-3 py-1.5"
                          style={{ background: "var(--severity-high)", color: "white" }}
                        >
                          {dict.presence.deleteButton}
                        </button>
                      </form>
                    </div>
                    <form action={updateZone.bind(null, z.id)} className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                      <label className="flex flex-col gap-1">
                        <span className="text-sm text-[var(--muted)] font-semibold">{dict.presence.ourOfficesLabel}</span>
                        <input
                          type="number"
                          name="our_offices_count"
                          defaultValue={z.our_offices_count ?? 0}
                          className="rounded-lg border border-[var(--border)] px-2.5 py-1.5 bg-[var(--card)]"
                        />
                      </label>
                      <label className="flex flex-col gap-1">
                        <span className="text-sm text-[var(--muted)] font-semibold">{dict.presence.ourPresencePctLabel}</span>
                        <input
                          type="number"
                          step="0.1"
                          name="our_presence_pct"
                          defaultValue={z.our_presence_pct ?? ""}
                          className="rounded-lg border border-[var(--border)] px-2.5 py-1.5 bg-[var(--card)]"
                        />
                      </label>
                      {[1, 2, 3].map((i) => (
                        <label key={i} className="flex flex-col gap-1 col-span-2 md:col-span-1">
                          <span className="text-sm text-[var(--muted)] font-semibold">
                            {dict.presence.partyLabelPrefix} {i} {dict.presence.partyLabelSuffix}
                          </span>
                          <div className="flex gap-1">
                            <input
                              name={`party_${i}_name`}
                              defaultValue={(z as any)[`party_${i}_name`] ?? ""}
                              placeholder={dict.presence.partyNamePlaceholder}
                              className="flex-1 rounded-lg border border-[var(--border)] px-2.5 py-1.5 bg-[var(--card)]"
                            />
                            <input
                              type="number"
                              name={`party_${i}_offices`}
                              defaultValue={(z as any)[`party_${i}_offices`] ?? ""}
                              placeholder="#"
                              className="w-14 rounded-lg border border-[var(--border)] px-2.5 py-1.5 bg-[var(--card)]"
                            />
                          </div>
                        </label>
                      ))}
                      <label className="flex flex-col gap-1 col-span-2 md:col-span-4">
                        <span className="text-sm text-[var(--muted)] font-semibold">{dict.presence.notesLabel}</span>
                        <input
                          name="notes"
                          defaultValue={z.notes ?? ""}
                          className="rounded-lg border border-[var(--border)] px-2.5 py-1.5 bg-[var(--card)]"
                        />
                      </label>
                      <button className="col-span-2 md:col-span-4 rounded-lg bg-[var(--brand-blue)] text-white font-bold px-3.5 py-2 text-sm hover:bg-[var(--brand-blue-hover)] transition">
                        {dict.presence.saveUpdateButton}
                      </button>
                    </form>

                    <div className="mt-4 pt-3 border-t border-[var(--border)]">
                      <div className="flex items-center gap-2 mb-2">
                        {(cellsByZone.get(z.id)?.length ?? 0) > 0 ? (
                          <span
                            className="text-xs font-bold rounded-full px-2.5 py-1"
                            style={{ background: "var(--severity-neutral)", color: "white" }}
                          >
                            {dict.presence.cellsCountBadge} {cellsByZone.get(z.id)?.length}
                          </span>
                        ) : (
                          <span
                            className="text-xs font-bold rounded-full px-2.5 py-1"
                            style={{ background: "var(--severity-high)", color: "white" }}
                          >
                            {dict.presence.noCellYetBadge}
                          </span>
                        )}
                      </div>

                      {(cellsByZone.get(z.id) ?? []).map((cell) => (
                        <div
                          key={cell.id}
                          className="flex items-center justify-between gap-2 text-sm rounded-lg bg-[var(--card)] border border-[var(--border)] px-3 py-2 mb-1.5"
                        >
                          <div>
                            <b className="text-[var(--text)]">{cell.cell_name ?? dict.presence.unnamedCell}</b>
                            {cell.contact_name && <span className="text-[var(--muted)]"> · {cell.contact_name}</span>}
                            {cell.contact_phone && <span className="text-[var(--muted)]"> · {cell.contact_phone}</span>}
                            <span className="text-[var(--muted)]"> · {dict.presence.sinceLabel} {cell.established_date}</span>
                            {cell.notes && <div className="text-[var(--muted)] text-xs mt-0.5">{cell.notes}</div>}
                          </div>
                          <form action={deleteCell.bind(null, cell.id)}>
                            <button
                              className="text-xs font-bold rounded-full px-2.5 py-1 shrink-0"
                              style={{ background: "var(--severity-high)", color: "white" }}
                            >
                              {dict.presence.deleteButton}
                            </button>
                          </form>
                        </div>
                      ))}

                      <details className="mt-2">
                        <summary className="cursor-pointer text-sm font-bold text-[var(--brand-blue)]">
                          {dict.presence.addCellSummary}
                        </summary>
                        <form
                          action={addCell.bind(null, z.id)}
                          className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm mt-2"
                        >
                          <input
                            name="cell_name"
                            placeholder={dict.presence.cellNamePlaceholder}
                            className="rounded-lg border border-[var(--border)] px-2.5 py-1.5 bg-[var(--card)]"
                          />
                          <input
                            name="contact_name"
                            placeholder={dict.presence.contactNamePlaceholder}
                            className="rounded-lg border border-[var(--border)] px-2.5 py-1.5 bg-[var(--card)]"
                          />
                          <input
                            name="contact_phone"
                            placeholder={dict.presence.contactPhonePlaceholder}
                            className="rounded-lg border border-[var(--border)] px-2.5 py-1.5 bg-[var(--card)]"
                          />
                          <input
                            name="notes"
                            placeholder={dict.presence.notesPlaceholder}
                            className="rounded-lg border border-[var(--border)] px-2.5 py-1.5 bg-[var(--card)]"
                          />
                          <button className="col-span-2 md:col-span-4 rounded-lg bg-[var(--brand-navy)] text-white font-bold px-3.5 py-2 text-sm">
                            {dict.presence.addCellButton}
                          </button>
                        </form>
                      </details>
                    </div>
                  </div>
                ))}
                {communeZones.length === 0 && (
                  <p className="text-[15px] text-[var(--muted)]">
                    {dict.presence.noZonesYet}
                  </p>
                )}

                <details className="rounded-lg border border-[var(--brand-blue)] p-4">
                  <summary className="cursor-pointer text-[15px] font-extrabold text-[var(--brand-blue)]">
                    {dict.presence.addZoneSummary}
                  </summary>
                  <form action={addZone.bind(null, c.id)} className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm mt-4">
                    <input
                      name="name"
                      required
                      placeholder={dict.presence.zoneNamePlaceholder}
                      className="rounded-lg border border-[var(--border)] px-2.5 py-1.5 bg-[var(--card)]"
                    />
                    <select
                      name="zone_type"
                      defaultValue="حي"
                      className="rounded-lg border border-[var(--border)] px-2.5 py-1.5 bg-[var(--card)]"
                    >
                      {ZONE_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {ZONE_TYPE_LABEL[t]}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      name="our_offices_count"
                      placeholder={dict.presence.ourOfficesLabel}
                      defaultValue={0}
                      className="rounded-lg border border-[var(--border)] px-2.5 py-1.5 bg-[var(--card)]"
                    />
                    <input
                      type="number"
                      step="0.1"
                      name="our_presence_pct"
                      placeholder={dict.presence.ourPresencePctLabel}
                      className="rounded-lg border border-[var(--border)] px-2.5 py-1.5 bg-[var(--card)]"
                    />
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex gap-1 col-span-2 md:col-span-1">
                        <input
                          name={`party_${i}_name`}
                          placeholder={`${dict.presence.partyLabelPrefix} ${i}`}
                          className="flex-1 rounded-lg border border-[var(--border)] px-2.5 py-1.5 bg-[var(--card)]"
                        />
                        <input
                          type="number"
                          name={`party_${i}_offices`}
                          placeholder="#"
                          className="w-14 rounded-lg border border-[var(--border)] px-2.5 py-1.5 bg-[var(--card)]"
                        />
                      </div>
                    ))}
                    <input
                      name="notes"
                      placeholder={dict.presence.notesPlaceholder}
                      className="col-span-2 md:col-span-4 rounded-lg border border-[var(--border)] px-2.5 py-1.5 bg-[var(--card)]"
                    />
                    <button className="col-span-2 md:col-span-4 rounded-lg bg-[var(--brand-navy)] text-white font-bold px-3.5 py-2">
                      {dict.presence.addButton}
                    </button>
                  </form>
                </details>
              </div>
            </details>
          );
        })}
      </div>
    </PageShell>
  );
}
