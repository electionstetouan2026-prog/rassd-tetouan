import PageShell from "@/components/PageShell";
import { createClient } from "@/lib/supabase/server";
import { IconTarget } from "@/components/icons";
import { getStrongholdMapData, type StrongholdRow } from "@/lib/strongholdMap";
import CommuneChoroplethMap from "@/components/CommuneChoroplethMap";
import ListSearch from "@/components/ListSearch";
import { getDictionary } from "@/lib/i18n/getDictionary";
import type { Dictionary } from "@/lib/i18n/getDictionary";

export const dynamic = "force-dynamic";

function scoreTone(score: number | null) {
  if (score == null) return { bg: "var(--border)", fg: "var(--muted)" };
  if (score >= 60) return { bg: "var(--severity-neutral)", fg: "white" };
  if (score >= 35) return { bg: "var(--severity-medium)", fg: "white" };
  return { bg: "var(--severity-high)", fg: "white" };
}

function Bar({ label, pct, hint }: { label: string; pct: number | null; hint?: string }) {
  return (
    <div className="mb-2">
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-[var(--muted)] font-semibold">{label}</span>
        <span className="font-bold text-[var(--text)]">
          {pct == null ? "—" : `${pct.toFixed(0)}%`}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-[var(--bg)] overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{ width: `${pct ?? 0}%`, background: "var(--brand-blue)" }}
        />
      </div>
      {hint && <div className="text-[11px] text-[var(--muted)] mt-0.5">{hint}</div>}
    </div>
  );
}

function Card({ row, dict, numberLocale, communeTypeLabel }: { row: StrongholdRow; dict: Dictionary; numberLocale: string; communeTypeLabel: Record<string, string> }) {
  const tone = scoreTone(row.compositeScore);
  return (
    <div data-search-item className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <div className="font-extrabold text-[16px] text-[var(--heading)]">{row.commune.name}</div>
          <div className="text-xs text-[var(--muted)] mt-0.5">
            {communeTypeLabel[row.commune.type] ?? row.commune.type}
            {row.commune.leading_party_2021 && (
              <>
                {" "}{dict.strongholdMap.baselineInline}{" "}
                {row.commune.leading_party_2021}
                {row.commune.leading_party_pct_2021 != null &&
                  ` (${Math.round(row.commune.leading_party_pct_2021 * 100)}%)`}
              </>
            )}
          </div>
        </div>
        <div
          className="w-16 h-16 rounded-full flex flex-col items-center justify-center shrink-0 font-extrabold"
          style={{ background: tone.bg, color: tone.fg }}
        >
          <span className="text-lg leading-none">
            {row.compositeScore == null ? "—" : Math.round(row.compositeScore)}
          </span>
          <span className="text-[9px] font-bold leading-none mt-0.5">/ 100</span>
        </div>
      </div>

      {row.dataComponents === 0 ? (
        <p className="text-sm text-[var(--muted)] mb-1">
          {dict.strongholdMap.noDataYet}
        </p>
      ) : (
        <div className="mb-1">
          <Bar
            label={dict.strongholdMap.supportRatioLabel}
            pct={row.supportRatioPct}
            hint={
              row.contactedCount > 0
                ? `${row.supporterCount} ${dict.strongholdMap.supporterHintOf} ${row.contactedCount} ${dict.strongholdMap.supporterHintSuffix}`
                : dict.strongholdMap.noContactYet
            }
          />
          <Bar
            label={dict.strongholdMap.contactCoverageLabel}
            pct={row.contactCoveragePct}
            hint={`${row.contactedCount.toLocaleString(numberLocale)} ${dict.presence.of} ${row.totalVoters.toLocaleString(numberLocale)} ${dict.pollingStations.votersUnit}`}
          />
          <Bar label={dict.strongholdMap.fieldCoverageCellsLabel} pct={row.fieldCoveragePct} />
          <Bar
            label={dict.strongholdMap.teamDensityLabel}
            pct={row.teamDensityScore}
            hint={`${row.teamCount} ${dict.strongholdMap.teamCountSuffix}`}
          />
        </div>
      )}

      <div className="pt-3 border-t border-[var(--border)] flex items-center gap-3 flex-wrap text-xs">
        <a href={`/voter-contact?commune=${row.commune.id}`} className="text-[var(--brand-blue)] font-semibold underline">
          {dict.strongholdMap.voterContactLink}
        </a>
        <a href="/presence" className="text-[var(--brand-blue)] font-semibold underline">
          {dict.strongholdMap.presenceLink}
        </a>
        <a href="/volunteers" className="text-[var(--brand-blue)] font-semibold underline">
          {dict.strongholdMap.volunteersLink}
        </a>
      </div>
    </div>
  );
}

export default async function StrongholdMapPage() {
  const { dict, locale } = await getDictionary();
  const numberLocale = locale === "fr" ? "fr-FR" : "ar";
  const communeTypeLabel: Record<string, string> = {
    "حضري": dict.presence.urban,
    "قروي": dict.presence.rural,
  };
  const supabase = await createClient();
  const { rows, withScore, total } = await getStrongholdMapData(supabase);

  const top = rows.find((r) => r.compositeScore != null) ?? null;

  return (
    <PageShell
      title={dict.strongholdMap.title}
      subtitle={dict.strongholdMap.subtitle}
      icon={<IconTarget />}
    >

      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 mb-6 shadow-sm">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="text-sm font-bold text-[var(--muted)]">{dict.strongholdMap.statCommunesWithScore}</div>
            <div className="text-[28px] font-extrabold text-[var(--heading)]">
              {withScore} / {total}
            </div>
          </div>
          {top && (
            <div>
              <div className="text-sm font-bold text-[var(--muted)]">{dict.strongholdMap.statTopScore}</div>
              <div className="text-[20px] font-extrabold text-[var(--heading)]">
                {top.commune.name} — {Math.round(top.compositeScore!)}/100
              </div>
            </div>
          )}
        </div>
        <p className="text-xs text-[var(--muted)] mt-4 leading-relaxed">
          <strong>{dict.strongholdMap.baselineNoteTitle}</strong>: {dict.strongholdMap.baselineNoteBody}
        </p>
      </div>

      <section className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 mb-6 shadow-sm">
        <h2 className="font-extrabold text-[var(--heading)] mb-1">{dict.strongholdMap.mapSectionTitle}</h2>
        <p className="text-xs text-[var(--muted)] mb-3">
          {dict.strongholdMap.mapSectionSubtitle}
        </p>
        <CommuneChoroplethMap
          data={rows.map((r) => ({
            id: r.commune.id,
            name: r.commune.name,
            score: r.compositeScore,
            hint: r.dataComponents === 0 ? dict.strongholdMap.mapNoDataHint : undefined,
          }))}
        />
      </section>

      <ListSearch scopeId="stronghold-list" placeholder={dict.strongholdMap.searchPlaceholder} />
      <div id="stronghold-list" className="grid md:grid-cols-2 gap-4">
        {rows.map((row) => (
          <Card key={row.commune.id} row={row} dict={dict} numberLocale={numberLocale} communeTypeLabel={communeTypeLabel} />
        ))}
      </div>
    </PageShell>
  );
}
