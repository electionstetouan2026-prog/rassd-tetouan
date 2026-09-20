import PageShell from "@/components/PageShell";
import { createClient } from "@/lib/supabase/server";
import { IconFlame } from "@/components/icons";
import { getHotBlocksData, getStationHotBlocks } from "@/lib/hotblocks";
import ListSearch from "@/components/ListSearch";
import { getDictionary } from "@/lib/i18n/getDictionary";
import type { Dictionary } from "@/lib/i18n/getDictionary";

export const dynamic = "force-dynamic";

function pct(value: number | null) {
  return value == null ? "—" : `${value.toFixed(0)}%`;
}

function priorityLabel(score: number, dict: Dictionary) {
  if (score >= 70) return { label: dict.hotBlocks.priorityHigh, color: "var(--severity-high)" };
  if (score >= 40) return { label: dict.hotBlocks.priorityMedium, color: "var(--severity-medium)" };
  return { label: dict.hotBlocks.priorityLow, color: "var(--severity-neutral)" };
}

export default async function HotBlocksPage({
  searchParams,
}: {
  searchParams: Promise<{ commune?: string }>;
}) {
  const params = await searchParams;
  const { dict, locale } = await getDictionary();
  const numberLocale = locale === "fr" ? "fr-FR" : "ar";
  const supabase = await createClient();
  const { rows, totalVoters } = await getHotBlocksData(supabase);

  const selected = params.commune ? rows.find((r) => r.commune.id === params.commune) : null;
  const stations = selected ? await getStationHotBlocks(supabase, selected.commune.id) : null;

  const highPriorityCount = rows.filter((r) => r.priorityScore >= 70).length;

  return (
    <PageShell
      title={dict.hotBlocks.title}
      subtitle={dict.hotBlocks.subtitle}
      icon={<IconFlame />}
    >
      <div className="grid sm:grid-cols-3 gap-4 mb-6">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm">
          <div className="text-sm font-bold text-[var(--muted)]">{dict.hotBlocks.statTotalVoters}</div>
          <div className="text-[28px] font-extrabold text-[var(--heading)]">{totalVoters.toLocaleString(numberLocale)}</div>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm">
          <div className="text-sm font-bold text-[var(--muted)]">{dict.hotBlocks.statCommunesCount}</div>
          <div className="text-[28px] font-extrabold text-[var(--heading)]">{rows.length}</div>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm">
          <div className="text-sm font-bold text-[var(--muted)]">{dict.hotBlocks.statHighPriorityCommunes}</div>
          <div className="text-[28px] font-extrabold" style={{ color: "var(--severity-high)" }}>
            {highPriorityCount}
          </div>
        </div>
      </div>

      {totalVoters === 0 && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 mb-6 text-sm text-[var(--muted)]">
          {dict.hotBlocks.emptyVotersWarning} <code>supabase/import_voters.sql</code> {dict.hotBlocks.emptyVotersWarningEnd}
        </div>
      )}
      {selected ? (
        <div>
          <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
            <div>
              <a href="/hot-blocks" className="text-sm text-[var(--brand-blue)] font-bold underline">
                {dict.hotBlocks.backToAllCommunes}
              </a>
              <h2 className="text-xl font-extrabold text-[var(--heading)] mt-1">
                {dict.hotBlocks.stationsForCommunePrefix} {selected.commune.name}
              </h2>
            </div>
            <span
              className="text-xs font-extrabold rounded-full px-3 py-1.5 text-white"
              style={{ background: priorityLabel(selected.priorityScore, dict).color }}
            >
              {priorityLabel(selected.priorityScore, dict).label} ({selected.priorityScore})
            </span>
          </div>
          <ListSearch scopeId="hot-blocks-stations-list" placeholder={dict.hotBlocks.searchStationsPlaceholder} dict={dict} locale={locale} />
          <div id="hot-blocks-stations-list" className="space-y-2">
            {(stations ?? []).map((s) => (
              <div
                key={s.id}
                data-search-item
                className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 flex items-center justify-between gap-3 shadow-sm"
              >
                <div>
                  <div className="font-bold text-[var(--heading)]">
                    {s.subOfficeNumber ? `${dict.pollingStations.officePrefix} ${s.subOfficeNumber} — ` : ""}
                    {s.centerName}
                  </div>
                  <div className="text-sm text-[var(--muted)] mt-0.5">{s.voterCount.toLocaleString(numberLocale)} {dict.pollingStations.votersUnit}</div>
                </div>
                <span
                  className="text-xs font-extrabold rounded-full px-3 py-1.5 shrink-0"
                  style={{
                    background: s.hasConfirmedObserver ? "var(--severity-neutral)" : "var(--severity-medium)",
                    color: "white",
                  }}
                >
                  {s.hasConfirmedObserver ? dict.pollingStations.confirmedObserverBadge : dict.hotBlocks.noConfirmedObserverBadge}
                </span>
              </div>
            ))}
            {(stations ?? []).length === 0 && (
              <p className="text-[15px] text-[var(--muted)]">{dict.hotBlocks.noRealStationsForCommune}</p>
            )}
          </div>
        </div>
      ) : (
        <>
        <ListSearch scopeId="hot-blocks-communes-list" placeholder={dict.hotBlocks.searchCommunesPlaceholder} dict={dict} locale={locale} />
        <div id="hot-blocks-communes-list" className="space-y-2.5">
          {rows.map((r) => {
            const p = priorityLabel(r.priorityScore, dict);
            return (
              <a
                key={r.commune.id}
                data-search-item
                href={`/hot-blocks?commune=${r.commune.id}`}
                className="block rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm hover:shadow-md transition"
              >
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <div className="font-extrabold text-[16px] text-[var(--heading)]">{r.commune.name}</div>
                    <div className="text-sm text-[var(--muted)] mt-0.5">
                      {r.voterCount.toLocaleString(numberLocale)} {dict.pollingStations.votersUnit} · {dict.hotBlocks.fieldCoverageBadge} {pct(r.fieldCoveragePct)} · {dict.hotBlocks.electionDayCoverageBadge} {pct(r.electionDayCoveragePct)}
                    </div>
                  </div>
                  <span
                    className="text-xs font-extrabold rounded-full px-3 py-1.5 text-white shrink-0"
                    style={{ background: p.color }}
                  >
                    {p.label} ({r.priorityScore})
                  </span>
                </div>
              </a>
            );
          })}
        </div>
        </>
      )}
    </PageShell>
  );
}
