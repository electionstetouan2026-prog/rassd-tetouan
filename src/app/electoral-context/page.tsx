import PageShell from "@/components/PageShell";
import { createClient } from "@/lib/supabase/server";
import { IconLandmark } from "@/components/icons";
import {
  getElectoralContextData,
  PPS_NAME,
  PPS_DISTRICT_FILE,
  PPS_LEGISLATIVE_HISTORY,
} from "@/lib/electoralContext";
import { addPartyOfficial, deletePartyOfficial } from "./actions";
import ListSearch from "@/components/ListSearch";
import { getDictionary, type Dictionary } from "@/lib/i18n/getDictionary";

function fmt(n: number | null, dict: Dictionary, numberLocale: string, suffix = "") {
  return n === null ? dict.electoralContext.notAvailable : `${n.toLocaleString(numberLocale)}${suffix}`;
}

export const dynamic = "force-dynamic";

export default async function ElectoralContextPage() {
  const supabase = await createClient();
  const { dict, locale } = await getDictionary();
  const numberLocale = locale === "fr" ? "fr-FR" : "ar-MA";
  const CATEGORY_LABEL: Record<string, string> = {
    "حالي": dict.electoralContext.categoryCurrent,
    "تاريخي": dict.electoralContext.categoryHistorical,
  };
  const COMMUNE_TYPE_LABEL: Record<string, string> = {
    "حضري": dict.presence.urban,
    "قروي": dict.presence.rural,
  };
  const [{ communeRows, totalVoters, totalStations, totalCommunes, officials }, { data: communesList }] =
    await Promise.all([
      getElectoralContextData(supabase),
      supabase.from("communes").select("id, name").order("name"),
    ]);

  const currentOfficials = officials.filter((o) => o.category === "حالي");
  const historicalOfficials = officials.filter((o) => o.category === "تاريخي");

  return (
    <PageShell
      title={dict.electoralContext.title}
      subtitle={dict.electoralContext.subtitle}
      icon={<IconLandmark />}
    >
      <div className="grid sm:grid-cols-3 gap-4 mb-6">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm">
          <div className="text-sm font-bold text-[var(--muted)]">{dict.electoralContext.statVotersImported}</div>
          <div className="text-[28px] font-extrabold text-[var(--heading)]">
            {totalVoters.toLocaleString(numberLocale)}
          </div>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm">
          <div className="text-sm font-bold text-[var(--muted)]">{dict.electoralContext.statRealStations}</div>
          <div className="text-[28px] font-extrabold text-[var(--heading)]">{totalStations}</div>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm">
          <div className="text-sm font-bold text-[var(--muted)]">{dict.electoralContext.statCommunes}</div>
          <div className="text-[28px] font-extrabold text-[var(--heading)]">{totalCommunes}</div>
        </div>
      </div>

      <section className="rounded-xl overflow-hidden mb-6 text-white shadow-sm" style={{ background: "linear-gradient(120deg, var(--brand-navy) 0%, var(--brand-navy-2) 100%)" }}>
        <div className="grid gap-6 p-6 lg:grid-cols-[1.2fr_2fr] lg:p-8">
          <div>
            <p className="text-xs font-bold text-white/70">{dict.electoralContext.partyProfileLabel}</p>
            <h2 className="mt-1 text-2xl font-black">{PPS_NAME}</h2>
            <div className="mt-5 rounded-2xl border border-white/15 bg-white/10 p-4">
              <p className="text-xs font-bold text-white/70">{dict.electoralContext.agent2026Label}</p>
              <p className="mt-2 text-xl font-black">{PPS_DISTRICT_FILE.candidate2026}</p>
              <p className="mt-2 text-xs leading-6 text-white/70">{PPS_DISTRICT_FILE.candidate2026Note}</p>
              <a
                href={PPS_DISTRICT_FILE.candidate2026SourceUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-block text-xs font-bold underline decoration-white/40 underline-offset-4"
              >
                {dict.electoralContext.verificationSourceLink}
              </a>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
              <p className="text-xs font-bold text-white/70">{dict.electoralContext.communalSeats2015Label}</p>
              <p className="mt-2 text-3xl font-black">{fmt(PPS_DISTRICT_FILE.communalSeats2015, dict, numberLocale)}</p>
              <p className="mt-1 text-[11px] text-white/60">
                {dict.electoralContext.distributedAcrossPrefix} {fmt(PPS_DISTRICT_FILE.communalSeats2015Communes, dict, numberLocale)} {dict.electoralContext.communesSuffix}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
              <p className="text-xs font-bold text-white/70">{dict.electoralContext.communalSeats2021Label}</p>
              <p className="mt-2 text-3xl font-black">{fmt(PPS_DISTRICT_FILE.communalSeats2021, dict, numberLocale)}</p>
              <p className="mt-1 text-[11px] text-white/60">
                {dict.electoralContext.representedInPrefix} {fmt(PPS_DISTRICT_FILE.communalSeats2021Communes, dict, numberLocale)} {dict.electoralContext.communeSuffix}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
              <p className="text-xs font-bold text-white/70">{dict.electoralContext.bestLegislativeResultLabel}</p>
              <p className="mt-2 text-3xl font-black">{fmt(PPS_DISTRICT_FILE.bestLegislativeVotes, dict, numberLocale)}</p>
              <p className="mt-1 text-[11px] text-white/60">
                {dict.electoralContext.votesInYearPrefix} {PPS_DISTRICT_FILE.bestLegislativeYear} {dict.electoralContext.percentageInline} {PPS_DISTRICT_FILE.bestLegislativePercentage}%
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
              <p className="text-xs font-bold text-white/70">{dict.electoralContext.councilMembers2021Label}</p>
              <p className="mt-2 text-3xl font-black">{fmt(PPS_DISTRICT_FILE.councilMembers2021Tetouan, dict, numberLocale)}</p>
              <p className="mt-1 text-[11px] text-white/60">{dict.electoralContext.namesRegisteredBelow}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-[var(--border)] bg-[var(--card)] mb-8 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-[var(--border)]">
          <h2 className="font-extrabold text-[var(--heading)]">{dict.electoralContext.legislativeHistoryTitle}</h2>
          <p className="text-xs text-[var(--muted)] mt-1">
            {dict.electoralContext.legislativeHistorySubtitle}
          </p>
        </div>
        <div className="grid gap-4 p-5 md:grid-cols-3">
          {PPS_LEGISLATIVE_HISTORY.map((r) => (
            <div key={r.year} className="rounded-xl border border-[var(--border)] bg-[var(--bg)] p-4">
              <div className="flex items-center justify-between">
                <span className="text-xl font-black text-[var(--heading)]">{r.year}</span>
                <span className="rounded-full bg-[var(--severity-high)]/10 px-3 py-1 text-[11px] font-black text-[var(--severity-high)]">
                  {r.seats} {dict.electoralContext.seatsUnit}
                </span>
              </div>
              <dl className="mt-4 space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <dt className="text-[var(--muted)]">{dict.electoralContext.votesLabel}</dt>
                  <dd className="font-black text-[var(--text)]">{fmt(r.votes, dict, numberLocale)}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-[var(--muted)]">{dict.electoralContext.percentageLabel}</dt>
                  <dd className="font-black text-[var(--text)]">{fmt(r.percentage, dict, numberLocale, "%")}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-[var(--muted)]">{dict.electoralContext.listAgentLabel}</dt>
                  <dd className="font-bold text-[var(--text)]">{r.agentName ?? dict.electoralContext.notAvailable}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-[var(--muted)]">{dict.electoralContext.overallParticipationLabel}</dt>
                  <dd className="font-bold text-[var(--text)]">{fmt(r.participationRate, dict, numberLocale, "%")}</dd>
                </div>
              </dl>
            </div>
          ))}
        </div>
      </section>

      <div className="rounded-xl px-5 py-4 mb-6 text-xs leading-relaxed text-[var(--muted)] bg-[var(--card)] border border-[var(--border)]">
        <strong className="text-[var(--text)]">{dict.electoralContext.dataHonestyNoteTitle}</strong>{dict.electoralContext.dataHonestyNoteBody}
      </div>

      <section className="rounded-xl border border-[var(--border)] bg-[var(--card)] mb-8 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-[var(--border)]">
          <h2 className="font-extrabold text-[var(--heading)]">{dict.electoralContext.baselineTableTitle}</h2>
          <p className="text-xs text-[var(--muted)] mt-1">
            {dict.electoralContext.baselineTableSubtitle}
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[720px]">
            <thead className="bg-[var(--bg)] text-xs text-[var(--muted)]">
              <tr>
                <th className="px-4 py-3 text-right font-bold">{dict.electoralContext.tableHeaderCommune}</th>
                <th className="px-4 py-3 text-right font-bold">{dict.electoralContext.tableHeaderLeadingParty2021}</th>
                <th className="px-4 py-3 text-right font-bold">{dict.electoralContext.tableHeaderSeats}</th>
                <th className="px-4 py-3 text-right font-bold">{dict.electoralContext.tableHeaderParticipation2021}</th>
                <th className="px-4 py-3 text-right font-bold">{dict.electoralContext.tableHeaderOurVoters}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {communeRows.map((r) => (
                <tr key={r.commune.id}>
                  <td className="px-4 py-3 font-bold text-[var(--heading)]">
                    {r.commune.name}
                    <span className="text-xs text-[var(--muted)] font-normal"> · {COMMUNE_TYPE_LABEL[r.commune.type] ?? r.commune.type}</span>
                  </td>
                  <td className="px-4 py-3 text-[var(--text)]">{r.commune.leading_party_2021 ?? "—"}</td>
                  <td className="px-4 py-3 text-[var(--text)]">
                    {r.commune.leading_party_seats_2021 != null && r.commune.seats_total_2021 != null
                      ? `${r.commune.leading_party_seats_2021} / ${r.commune.seats_total_2021}`
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-[var(--text)]">
                    {r.commune.participation_rate_2021 != null
                      ? `${Math.round(r.commune.participation_rate_2021 * 100)}%`
                      : "—"}
                  </td>
                  <td className="px-4 py-3 font-bold text-[var(--heading)]">{r.realVoters.toLocaleString(numberLocale)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mb-8 rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm">
        <h2 className="text-lg font-extrabold mb-4 text-[var(--heading)]">{dict.electoralContext.addOfficialTitle}</h2>
        <form action={addPartyOfficial} className="grid grid-cols-2 gap-3">
          <input
            name="full_name"
            placeholder={dict.volunteers.fullNamePlaceholder}
            required
            className="rounded-lg border border-[var(--border)] px-3.5 py-2.5 text-[15px] bg-[var(--bg)] focus:border-[var(--brand-blue)] focus:outline-none"
          />
          <input
            name="role"
            placeholder={dict.electoralContext.rolePlaceholder}
            className="rounded-lg border border-[var(--border)] px-3.5 py-2.5 text-[15px] bg-[var(--bg)] focus:border-[var(--brand-blue)] focus:outline-none"
          />
          <select
            name="commune_id"
            defaultValue=""
            className="rounded-lg border border-[var(--border)] px-3.5 py-2.5 text-[15px] bg-[var(--bg)]"
          >
            <option value="">{dict.volunteers.communeOptionalOption}</option>
            {(communesList ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select
            name="category"
            defaultValue="حالي"
            className="rounded-lg border border-[var(--border)] px-3.5 py-2.5 text-[15px] bg-[var(--bg)]"
          >
            <option value="حالي">{dict.electoralContext.categoryCurrent}</option>
            <option value="تاريخي">{dict.electoralContext.categoryHistorical}</option>
          </select>
          <input
            name="notes"
            placeholder={dict.volunteers.notesPlaceholder}
            className="col-span-2 rounded-lg border border-[var(--border)] px-3.5 py-2.5 text-[15px] bg-[var(--bg)] focus:border-[var(--brand-blue)] focus:outline-none"
          />
          <button className="col-span-2 rounded-lg bg-[var(--brand-blue)] text-white font-bold px-4 py-2.5 hover:bg-[var(--brand-blue-hover)] transition">
            {dict.electoralContext.addButton}
          </button>
        </form>
      </section>

      <div className="grid md:grid-cols-2 gap-5">
        <section className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm">
          <h2 className="font-extrabold text-[var(--heading)] mb-3">{dict.electoralContext.currentOfficialsTitle} ({currentOfficials.length})</h2>
          <ListSearch scopeId="current-officials-list" placeholder={dict.electoralContext.searchOfficialsPlaceholder} />
          <div id="current-officials-list" className="divide-y divide-[var(--border)]">
            {currentOfficials.map((o) => (
              <div key={o.id} data-search-item className="flex items-start justify-between gap-3 py-3">
                <div>
                  <div className="font-bold text-[var(--text)]">{o.full_name}</div>
                  <div className="text-xs text-[var(--muted)] mt-0.5">
                    {o.role ?? ""}
                    {o.role && o.commune ? " · " : ""}
                    {o.commune?.name ?? ""}
                  </div>
                  {o.notes && <div className="text-xs text-[var(--muted)] mt-0.5">{o.notes}</div>}
                </div>
                <form action={deletePartyOfficial.bind(null, o.id)}>
                  <button
                    className="text-xs font-bold rounded-full px-3 py-1.5 shrink-0"
                    style={{ background: "var(--severity-high)", color: "white" }}
                  >
                    {dict.volunteers.deleteButton}
                  </button>
                </form>
              </div>
            ))}
            {currentOfficials.length === 0 && (
              <p className="text-sm text-[var(--muted)] py-3">{dict.electoralContext.noNamesYet}</p>
            )}
          </div>
        </section>

        <section className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm">
          <h2 className="font-extrabold text-[var(--heading)] mb-3">{dict.electoralContext.historicalNamesTitle} ({historicalOfficials.length})</h2>
          <ListSearch scopeId="historical-officials-list" placeholder={dict.electoralContext.searchOfficialsPlaceholder} />
          <div id="historical-officials-list" className="divide-y divide-[var(--border)]">
            {historicalOfficials.map((o) => (
              <div key={o.id} data-search-item className="flex items-start justify-between gap-3 py-3">
                <div>
                  <div className="font-bold text-[var(--text)]">{o.full_name}</div>
                  <div className="text-xs text-[var(--muted)] mt-0.5">
                    {o.role ?? ""}
                    {o.role && o.commune ? " · " : ""}
                    {o.commune?.name ?? ""}
                  </div>
                  {o.notes && <div className="text-xs text-[var(--muted)] mt-0.5">{o.notes}</div>}
                </div>
                <form action={deletePartyOfficial.bind(null, o.id)}>
                  <button
                    className="text-xs font-bold rounded-full px-3 py-1.5 shrink-0"
                    style={{ background: "var(--severity-high)", color: "white" }}
                  >
                    {dict.volunteers.deleteButton}
                  </button>
                </form>
              </div>
            ))}
            {historicalOfficials.length === 0 && (
              <p className="text-sm text-[var(--muted)] py-3">{dict.electoralContext.noNamesYet}</p>
            )}
          </div>
        </section>
      </div>
    </PageShell>
  );
}
