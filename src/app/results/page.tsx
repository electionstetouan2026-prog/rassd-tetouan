import PageShell from "@/components/PageShell";
import { createClient } from "@/lib/supabase/server";
import { IconBallot } from "@/components/icons";
import {
  getElectionResultsData,
  getLocalListOfficialResult,
  LOCAL_LIST_DISTRICT_CONTEXT,
  OUR_PARTY_KEY,
} from "@/lib/electionResults";
import ListSearch from "@/components/ListSearch";
import { getDictionary } from "@/lib/i18n/getDictionary";

export const dynamic = "force-dynamic";

function pct(value: number | null, digits = 1) {
  return value == null ? "—" : `${(value * 100).toFixed(digits)}%`;
}

function ratio(numerator: number, denominator: number, digits = 1) {
  if (!denominator) return "—";
  return `${((numerator / denominator) * 100).toFixed(digits)}%`;
}

export default async function ResultsPage() {
  const { dict, locale } = await getDictionary();
  const numberLocale = locale === "fr" ? "fr-FR" : "ar";
  const supabase = await createClient();
  const { results, summary, totals, coveredOfficesCount, unmatchedOffices, partyKeys } =
    await getElectionResultsData(supabase);
  const { rows: officialRows, ourRow: officialOurRow, ourVoteRank: officialOurRank, totalCandidates: officialTotal } =
    await getLocalListOfficialResult(supabase);

  const t = dict.results;
  const sortedSummary = [...summary].sort((a, b) => a.listRank - b.listRank);
  const sortedOfficialByVotes = [...officialRows].sort((a, b) => b.votes - a.votes);

  return (
    <PageShell title={t.title} subtitle={t.subtitle} icon={<IconBallot />}>
      {officialOurRow && (
        <div
          className="rounded-xl border p-5 mb-6 shadow-sm"
          style={{ borderColor: "var(--brand-blue)", background: "color-mix(in srgb, var(--brand-blue) 6%, var(--card))" }}
        >
          <div className="font-extrabold text-[15px] mb-1.5" style={{ color: "var(--brand-blue)" }}>
            ✓ {t.officialSectionTitle}
          </div>
          <p className="text-sm text-[var(--muted)] leading-relaxed mb-4">{t.officialSectionSubtitle}</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            {[
              { label: t.officialOurVotesLabel, value: officialOurRow.votes.toLocaleString(numberLocale) },
              { label: t.officialOurRankLabel, value: `${officialOurRank} / ${officialTotal}` },
              { label: t.officialSeatsLabel, value: officialOurRow.seatsWon.toLocaleString(numberLocale) },
              { label: t.officialSeatsAvailableLabel, value: `${LOCAL_LIST_DISTRICT_CONTEXT.seatsAvailable}` },
            ].map((s) => (
              <div key={s.label} className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm">
                <div className="text-xs font-bold text-[var(--muted)]">{s.label}</div>
                <div className="text-xl font-extrabold text-[var(--heading)] mt-1">{s.value}</div>
              </div>
            ))}
          </div>
          <details>
            <summary className="text-sm font-bold cursor-pointer text-[var(--brand-blue)]">{t.officialTableToggle}</summary>
            <div className="mt-3 rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-sm overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)] text-[var(--muted)]">
                    <th className="text-start font-bold px-3 py-2.5">{t.officialTableRank}</th>
                    <th className="text-start font-bold px-3 py-2.5">{t.officialTableCandidate}</th>
                    <th className="text-start font-bold px-3 py-2.5">{t.officialTableVotes}</th>
                    <th className="text-start font-bold px-3 py-2.5">{t.officialTableSeats}</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedOfficialByVotes.map((r, i) => (
                    <tr
                      key={r.id}
                      className="border-b border-[var(--border)] last:border-0"
                      style={r.isOurCandidate ? { background: "color-mix(in srgb, var(--brand-blue) 10%, transparent)" } : undefined}
                    >
                      <td className="px-3 py-2.5 font-bold text-[var(--muted)]">{i + 1}</td>
                      <td className="px-3 py-2.5 font-extrabold text-[var(--heading)]">
                        {r.candidateName}
                        {r.isOurCandidate && (
                          <span className="me-2 text-[11px] font-extrabold rounded-full px-2 py-0.5 text-white" style={{ background: "var(--brand-blue)" }}>
                            {t.ourListBadge}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        {r.votes.toLocaleString(numberLocale)}
                        {r.approxReading && <span className="ms-1 text-[var(--muted)]">≈</span>}
                      </td>
                      <td className="px-3 py-2.5">{r.seatsWon}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-[var(--muted)] mt-2">{t.officialTableFootnote}</p>
          </details>
        </div>
      )}

      <div
        className="rounded-xl border p-5 mb-6 shadow-sm"
        style={{ borderColor: "var(--severity-medium)", background: "color-mix(in srgb, var(--severity-medium) 8%, var(--card))" }}
      >
        <div className="font-extrabold text-[15px] mb-1.5" style={{ color: "var(--severity-medium)" }}>
          ⚠ {t.disclaimerTitle}
        </div>
        <p className="text-sm text-[var(--muted)] leading-relaxed">{t.disclaimerBody}</p>
      </div>

      <div className="grid sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        {[
          { label: t.statRegistered, value: totals.registered.toLocaleString(numberLocale) },
          { label: t.statVoters, value: totals.voters.toLocaleString(numberLocale) },
          { label: t.statTurnout, value: ratio(totals.voters, totals.registered) },
          { label: t.statValid, value: totals.valid.toLocaleString(numberLocale) },
          { label: t.statVoid, value: totals.void.toLocaleString(numberLocale) },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm">
            <div className="text-xs font-bold text-[var(--muted)]">{s.label}</div>
            <div className="text-xl font-extrabold text-[var(--heading)] mt-1">{s.value}</div>
          </div>
        ))}
      </div>

      <div className="mb-8">
        <h2 className="text-lg font-extrabold text-[var(--heading)] mb-1">{t.summaryTitle}</h2>
        <p className="text-sm text-[var(--muted)] mb-3">{t.summarySubtitle}</p>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] text-[var(--muted)]">
                <th className="text-start font-bold px-3 py-2.5">{t.summaryRank}</th>
                <th className="text-start font-bold px-3 py-2.5">{t.summaryList}</th>
                <th className="text-start font-bold px-3 py-2.5">{t.summaryVotes}</th>
                <th className="text-start font-bold px-3 py-2.5">{t.summaryPct}</th>
                <th className="text-start font-bold px-3 py-2.5">{t.summaryLinkStatus}</th>
                <th className="text-start font-bold px-3 py-2.5">{t.summaryNote}</th>
              </tr>
            </thead>
            <tbody>
              {sortedSummary.map((s) => (
                <tr
                  key={s.id}
                  className="border-b border-[var(--border)] last:border-0"
                  style={s.isOurList ? { background: "color-mix(in srgb, var(--brand-blue) 10%, transparent)" } : undefined}
                >
                  <td className="px-3 py-2.5 font-bold text-[var(--muted)]">{s.listRank}</td>
                  <td className="px-3 py-2.5 font-extrabold text-[var(--heading)]">
                    {s.listName}
                    {s.isOurList && (
                      <span className="me-2 text-[11px] font-extrabold rounded-full px-2 py-0.5 text-white" style={{ background: "var(--brand-blue)" }}>
                        {t.ourListBadge}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2.5">{s.totalVotes.toLocaleString(numberLocale)}</td>
                  <td className="px-3 py-2.5">{pct(s.pctValid)}</td>
                  <td className="px-3 py-2.5">{s.linkStatus}</td>
                  <td className="px-3 py-2.5 text-[var(--muted)]">{s.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {unmatchedOffices.length > 0 && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 mb-6 text-sm">
          <div className="font-extrabold text-[var(--heading)] mb-1">{t.unmatchedWarning}</div>
          <div className="text-[var(--muted)]">
            {unmatchedOffices.map((o) => `${o.officeNumber} — ${o.centerName}`).join(" · ")}
          </div>
        </div>
      )}

      <div>
        <div className="flex items-center justify-between flex-wrap gap-3 mb-1">
          <h2 className="text-lg font-extrabold text-[var(--heading)]">{t.detailTitle}</h2>
          <span className="text-xs font-extrabold rounded-full px-3 py-1.5 text-white" style={{ background: "var(--severity-neutral)" }}>
            {coveredOfficesCount} / {results.length} {t.colCoverage}
          </span>
        </div>
        <p className="text-sm text-[var(--muted)] mb-1">{t.detailSubtitle}</p>
        <p className="text-xs text-[var(--muted)] mb-3">{t.partyColumnsNote}</p>
        <ListSearch scopeId="results-detail-table" placeholder={t.searchOfficesPlaceholder} dict={dict} locale={locale} />

        <div id="results-detail-table" className="rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] text-[var(--muted)] whitespace-nowrap">
                <th className="text-start font-bold px-3 py-2.5">{t.colOffice}</th>
                <th className="text-start font-bold px-3 py-2.5">{t.colCenter}</th>
                <th className="text-start font-bold px-3 py-2.5">{t.colCommune}</th>
                <th className="text-start font-bold px-3 py-2.5">{t.colCoverage}</th>
                <th className="text-start font-bold px-3 py-2.5">{t.colRegistered}</th>
                <th className="text-start font-bold px-3 py-2.5">{t.colVoters}</th>
                <th className="text-start font-bold px-3 py-2.5">{t.colTurnout}</th>
                <th className="text-start font-bold px-3 py-2.5">{t.colValid}</th>
                {partyKeys.map((p) => (
                  <th
                    key={p}
                    className="text-start font-bold px-3 py-2.5"
                    style={p === OUR_PARTY_KEY ? { color: "var(--brand-blue)" } : undefined}
                  >
                    {p}
                  </th>
                ))}
                <th className="text-start font-bold px-3 py-2.5">{t.colStatus}</th>
              </tr>
            </thead>

            <tbody>
              {results.map((r) => (
                <tr
                  key={r.id}
                  data-search-item
                  data-search-text={`${r.officeNumber} ${r.centerName} ${r.matchedCommuneName ?? ""}`}
                  className="border-b border-[var(--border)] last:border-0 whitespace-nowrap hover:bg-black/[0.02]"
                >
                  <td className="px-3 py-2.5 font-bold text-[var(--muted)]">{r.officeNumber}</td>
                  <td className="px-3 py-2.5 font-extrabold text-[var(--heading)]">{r.centerName}</td>
                  <td className="px-3 py-2.5 text-[var(--muted)]">{r.matchedCommuneName ?? "—"}</td>
                  <td className="px-3 py-2.5">
                    {r.matchedStationIds.length === 0 ? (
                      <span className="text-xs font-bold text-[var(--muted)]">{t.coverageUnmatched}</span>
                    ) : (
                      <span
                        className="text-xs font-extrabold rounded-full px-2.5 py-1 text-white"
                        style={{ background: r.hasCoverage ? "var(--severity-neutral)" : "var(--severity-medium)" }}
                      >
                        {r.hasCoverage ? t.coverageBadgeYes : t.coverageBadgeNo} ({r.observerCount} {t.observersCountSuffix})
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2.5">{(r.registeredVoters ?? 0).toLocaleString(numberLocale)}</td>
                  <td className="px-3 py-2.5">{(r.votersCount ?? 0).toLocaleString(numberLocale)}</td>
                  <td className="px-3 py-2.5">{ratio(r.votersCount ?? 0, r.registeredVoters ?? 0)}</td>
                  <td className="px-3 py-2.5">{(r.validVotes ?? 0).toLocaleString(numberLocale)}</td>
                  {partyKeys.map((p) => (
                    <td
                      key={p}
                      className="px-3 py-2.5"
                      style={p === OUR_PARTY_KEY ? { fontWeight: 800, color: "var(--brand-blue)" } : undefined}
                    >
                      {(r.partyVotes[p] ?? 0).toLocaleString(numberLocale)}
                    </td>
                  ))}
                  <td className="px-3 py-2.5 text-[var(--muted)]">{r.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </PageShell>
  );
}
