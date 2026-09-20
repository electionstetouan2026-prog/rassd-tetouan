import PageShell from "@/components/PageShell";
import { createClient } from "@/lib/supabase/server";
import { IconChart } from "@/components/icons";
import { getRankingData } from "@/lib/ranking";
import { getDigitalCompetitiveRanking } from "@/lib/digitalRanking";
import { isGeminiConfigured } from "@/lib/ai/gemini";
import { generateRankingSummary } from "./actions";
import AiSummaryBox from "./AiSummaryBox";
import ListSearch from "@/components/ListSearch";
import Link from "next/link";
import { getDictionary } from "@/lib/i18n/getDictionary";

export const dynamic = "force-dynamic";

const SENTIMENT_ICON: Record<string, string> = {
  "إيجابي": "🟢",
  "محايد": "⚪",
  "سلبي": "🔴",
};

const TREND_ICON: Record<string, string> = { up: "📈", down: "📉", flat: "➖" };

export default async function RankingPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const { dict, locale } = await getDictionary();
  const dateLocale = locale === "fr" ? "fr-FR" : "ar-MA";
  const COMMUNE_TYPE_LABEL: Record<string, string> = {
    "حضري": dict.presence.urban,
    "قروي": dict.presence.rural,
  };
  const params = await searchParams;
  const view = params.view ?? "attention"; // attention | all

  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);

  const [{ communes, communeRows, totalUrgentOpen, communesWithFieldData, unassignedEntries }, { data: todaySummary }, digitalRanking] =
    await Promise.all([
      getRankingData(supabase),
      supabase.from("ranking_ai_summaries").select("summary_text, model, created_at").eq("summary_date", today).maybeSingle(),
      getDigitalCompetitiveRanking(supabase),
    ]);

  const visibleRows = view === "attention" ? communeRows.filter((r) => r.needsAttention) : communeRows;

  return (
    <PageShell
      title={dict.ranking.title}
      subtitle={dict.ranking.subtitle}
      icon={<IconChart />}
    >
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 mb-6 flex items-center justify-between flex-wrap gap-4 shadow-sm">
        <div>
          <div className="text-sm font-bold text-[var(--muted)]">{dict.ranking.statCommunesWithFieldData}</div>
          <div className="text-[28px] font-extrabold text-[var(--heading)]">
            {communesWithFieldData} / {communes.length}
          </div>
        </div>
        <div className="text-sm text-[var(--muted)]">
          {totalUrgentOpen > 0 ? (
            <span className="font-bold" style={{ color: "var(--severity-high)" }}>
              {totalUrgentOpen} {dict.ranking.urgentSignalsSuffix}
            </span>
          ) : (
            dict.ranking.noUrgentSignals
          )}
        </div>
      </div>

      <section className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 mb-6 shadow-sm">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-1">
          <h2 className="text-lg font-extrabold text-[var(--heading)]">{dict.ranking.digitalRankingTitle}</h2>
          <div className="flex items-center gap-3 flex-wrap">
            <Link href="/candidates" className="text-sm text-[var(--brand-blue)] font-semibold underline">
              {dict.ranking.candidatesLinkLabel}
            </Link>
            <Link href="/digital-watch/import-polibrand" className="text-sm text-[var(--brand-blue)] font-semibold underline">
              {dict.ranking.importPolibrandLinkLabel}
            </Link>
          </div>
        </div>
        <p className="text-sm text-[var(--muted)] mb-4">
          {dict.ranking.digitalIntroPart1}
          {digitalRanking.windowDays}
          {dict.ranking.digitalIntroDaysSuffix}
          <Link href="/candidates" className="underline">
            {dict.ranking.editFromHereLink}
          </Link>
          {dict.ranking.digitalIntroPart3}
          {digitalRanking.analyzedShare < 1 && (
            <>
              {" "}
              ({Math.round(digitalRanking.analyzedShare * 100)}
              {dict.ranking.analyzedSharePctSuffix}
              <Link href="/digital-watch/import-polibrand" className="underline">
                {dict.ranking.continueAnalysisLink}
              </Link>
              .)
            </>
          )}
        </p>
        {digitalRanking.hasData ? (
          <div className="space-y-2">
            {digitalRanking.ranked.map((r, i) => (
              <div
                key={r.name}
                className="flex items-center justify-between gap-3 rounded-lg px-3.5 py-2.5 text-sm"
                style={{
                  background: r.isUs ? "var(--brand-blue)" : "var(--bg)",
                  color: r.isUs ? "white" : "var(--text)",
                }}
              >
                <span className="font-bold">
                  {i + 1}. {r.name}
                  {(r.party || r.currentPosition) && (
                    <span className="mr-2 text-xs font-normal opacity-70">
                      {r.party ?? ""}
                      {r.party && r.currentPosition ? " · " : ""}
                      {r.currentPosition ?? ""}
                    </span>
                  )}
                  {r.isNewlyDiscovered && <span className="mr-2 text-xs opacity-80">{dict.ranking.newlyDiscoveredBadge}</span>}
                  {r.trend && <span className="mr-2 opacity-80">{TREND_ICON[r.trend]}</span>}
                </span>
                <span className="flex items-center gap-3 font-semibold">
                  <span>
                    {SENTIMENT_ICON["إيجابي"]} {r.sentimentCounts["إيجابي"]}
                    {"  "}
                    {SENTIMENT_ICON["محايد"]} {r.sentimentCounts["محايد"]}
                    {"  "}
                    {SENTIMENT_ICON["سلبي"]} {r.sentimentCounts["سلبي"]}
                  </span>
                  <span className="text-xs opacity-80">{r.currentCount} {dict.ranking.signalsUnit}</span>
                  <span className="font-extrabold">{dict.ranking.estimatedInfluenceLabel} {r.estimatedInfluence}</span>
                  {r.baselineStrength != null && (
                    <span
                      className="text-xs font-bold rounded-full px-2.5 py-1"
                      style={{
                        background: r.isUs ? "rgba(255,255,255,0.2)" : "var(--card)",
                        border: r.isUs ? "none" : "1px solid var(--border)",
                      }}
                      title={dict.ranking.structuralWeightTooltip}
                    >
                      {dict.ranking.structuralWeightLabel} {r.baselineStrength}
                    </span>
                  )}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-[var(--muted)]">
            {dict.ranking.noDigitalDataMessage}
            <Link href="/digital-watch/import-polibrand" className="text-[var(--brand-blue)] underline">
              {dict.ranking.importFirstFileLink}
            </Link>
            .
          </p>
        )}
      </section>

      <AiSummaryBox
        dict={dict}
        dateLocale={dateLocale}
        summaryText={todaySummary?.summary_text ?? null}
        model={todaySummary?.model ?? null}
        generatedAt={todaySummary?.created_at ?? null}
        aiEnabled={isGeminiConfigured()}
        onGenerate={generateRankingSummary}
      />

      {unassignedEntries.length > 0 && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 mb-6 text-sm text-[var(--muted)]">
          {unassignedEntries.length} {dict.ranking.unassignedEntriesSuffix}
        </div>
      )}

      <div className="flex gap-2 flex-wrap mb-6">
        <a
          href="/ranking?view=attention"
          className={`text-sm rounded-full px-4 py-2 border font-bold shadow-sm ${
            view === "attention"
              ? "bg-[var(--brand-blue)] text-white border-[var(--brand-blue)]"
              : "border-[var(--border)] bg-[var(--card)] text-[var(--text)]"
          }`}
        >
          {dict.ranking.needsAttentionTab} ({communeRows.filter((r) => r.needsAttention).length})
        </a>
        <a
          href="/ranking?view=all"
          className={`text-sm rounded-full px-4 py-2 border font-bold shadow-sm ${
            view === "all"
              ? "bg-[var(--brand-blue)] text-white border-[var(--brand-blue)]"
              : "border-[var(--border)] bg-[var(--card)] text-[var(--text)]"
          }`}
        >
          {dict.ranking.allCommunesTab} ({communes.length})
        </a>
      </div>

      <ListSearch scopeId="ranking-list" placeholder={dict.ranking.searchCommunePlaceholder} dict={dict} locale={locale} />
      <div id="ranking-list" className="grid md:grid-cols-2 gap-4">
        {visibleRows.map((r) => (
          <div key={r.commune.id} data-search-item className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <div className="font-extrabold text-[16px] text-[var(--heading)]">{r.commune.name}</div>
                <div className="text-sm text-[var(--muted)] mt-0.5">
                  {COMMUNE_TYPE_LABEL[r.commune.type] ?? r.commune.type}
                  {r.commune.leading_party_2021 ? `${dict.ranking.baseline2021Prefix}${r.commune.leading_party_2021} (${r.commune.leading_party_pct_2021}%)` : ""}
                </div>
              </div>
              {r.urgentOpen > 0 && (
                <span
                  className="text-xs font-extrabold rounded-full px-3 py-1.5 text-white shrink-0"
                  style={{ background: "var(--severity-high)" }}
                >
                  {r.urgentOpen} {dict.ranking.urgentBadgeSuffix}
                </span>
              )}
            </div>

            {r.hasFieldData ? (
              <div className="mb-3">
                <div className="text-xs font-bold text-[var(--muted)] mb-1.5">
                  {dict.ranking.fieldRankingTitlePrefix}{r.zonesCount}{dict.ranking.fieldRankingTitleSuffix}
                </div>
                <div className="space-y-1.5">
                  {r.ranking.map((p, i) => (
                    <div
                      key={p.name}
                      className="flex items-center justify-between text-sm rounded-lg px-3 py-2"
                      style={{
                        background: p.isUs ? "var(--brand-blue)" : "var(--bg)",
                        color: p.isUs ? "white" : "var(--text)",
                      }}
                    >
                      <span className="font-bold">
                        {i + 1}. {p.name}
                      </span>
                      <span className="font-extrabold">{p.offices}</span>
                    </div>
                  ))}
                </div>
                {r.ourPresenceAvg != null && (
                  <div className="text-xs text-[var(--muted)] mt-1.5">
                    {dict.ranking.ourPresenceAvgLabel}{r.ourPresenceAvg.toFixed(0)}%
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-[var(--muted)] mb-3">
                {dict.ranking.noFieldDataPart1}
                <a href="/presence" className="text-[var(--brand-blue)] underline">{dict.ranking.presenceMapLink}</a>.
              </p>
            )}

            <div className="pt-3 border-t border-[var(--border)] text-sm text-[var(--muted)] flex items-center justify-between flex-wrap gap-2">
              <span>
                {r.digitalTotal > 0 ? (
                  <>
                    {SENTIMENT_ICON["إيجابي"]} {r.sentimentCounts["إيجابي"]}
                    {"  "}
                    {SENTIMENT_ICON["محايد"]} {r.sentimentCounts["محايد"]}
                    {"  "}
                    {SENTIMENT_ICON["سلبي"]} {r.sentimentCounts["سلبي"]}
                    {dict.ranking.digitalWatchSuffix}
                  </>
                ) : (
                  dict.ranking.noDigitalRecordsYet
                )}
              </span>
              <a href={`/digital-watch`} className="text-[var(--brand-blue)] font-semibold underline">
                {dict.ranking.viewRecordsLink}
              </a>
            </div>
          </div>
        ))}
        {visibleRows.length === 0 && (
          <p className="text-[15px] text-[var(--muted)] md:col-span-2">
            {view === "attention" ? dict.ranking.noAttentionCommunes : dict.ranking.noCommunesAtAll}
          </p>
        )}
      </div>
    </PageShell>
  );
}
