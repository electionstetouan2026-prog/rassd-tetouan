import PageShell from "@/components/PageShell";
import { createClient } from "@/lib/supabase/server";
import { IconChart } from "@/components/icons";

export const dynamic = "force-dynamic";

const SENTIMENT_ICON: Record<string, string> = {
  "إيجابي": "🟢",
  "محايد": "⚪",
  "سلبي": "🔴",
};

type Commune = {
  id: string;
  name: string;
  type: string;
  leading_party_2021: string | null;
  leading_party_pct_2021: number | null;
};
type Zone = {
  commune_id: string;
  our_offices_count: number | null;
  our_presence_pct: number | null;
  party_1_name: string | null;
  party_1_offices: number | null;
  party_2_name: string | null;
  party_2_offices: number | null;
  party_3_name: string | null;
  party_3_offices: number | null;
};
type WatchEntry = {
  commune_id: string | null;
  sentiment: string;
  priority: string;
  status: string;
};

function tallyParties(zones: Zone[]) {
  const tally: Record<string, number> = {};
  for (const z of zones) {
    const pairs: [string | null, number | null][] = [
      [z.party_1_name, z.party_1_offices],
      [z.party_2_name, z.party_2_offices],
      [z.party_3_name, z.party_3_offices],
    ];
    for (const [name, offices] of pairs) {
      if (!name) continue;
      tally[name] = (tally[name] ?? 0) + (offices ?? 0);
    }
  }
  return tally;
}

export default async function RankingPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const params = await searchParams;
  const view = params.view ?? "attention"; // attention | all

  const supabase = await createClient();

  const [{ data: communesRaw }, { data: zonesRaw }, { data: entriesRaw }] = await Promise.all([
    supabase
      .from("communes")
      .select("id, name, type, leading_party_2021, leading_party_pct_2021")
      .order("name"),
    supabase
      .from("commune_zones")
      .select(
        "commune_id, our_offices_count, our_presence_pct, party_1_name, party_1_offices, party_2_name, party_2_offices, party_3_name, party_3_offices"
      ),
    supabase.from("digital_watch_entries").select("commune_id, sentiment, priority, status"),
  ]);

  const communes = (communesRaw ?? []) as Commune[];
  const zones = (zonesRaw ?? []) as Zone[];
  const entries = (entriesRaw ?? []) as WatchEntry[];

  const unassignedEntries = entries.filter((e) => !e.commune_id);

  const communeRows = communes.map((c) => {
    const cZones = zones.filter((z) => z.commune_id === c.id);
    const cEntries = entries.filter((e) => e.commune_id === c.id);

    const ourOfficesTotal = cZones.reduce((sum, z) => sum + (z.our_offices_count ?? 0), 0);
    const presenceValues = cZones.map((z) => z.our_presence_pct).filter((v): v is number => v != null);
    const ourPresenceAvg = presenceValues.length
      ? presenceValues.reduce((a, b) => a + b, 0) / presenceValues.length
      : null;

    const partyTally = tallyParties(cZones);
    const ranking = [
      { name: "نحن (زهير الركاني)", offices: ourOfficesTotal, isUs: true },
      ...Object.entries(partyTally).map(([name, offices]) => ({ name, offices, isUs: false })),
    ].sort((a, b) => b.offices - a.offices);

    const sentimentCounts: Record<string, number> = { "إيجابي": 0, "محايد": 0, "سلبي": 0 };
    for (const e of cEntries) sentimentCounts[e.sentiment] = (sentimentCounts[e.sentiment] ?? 0) + 1;
    const urgentOpen = cEntries.filter(
      (e) => e.priority === "عاجل" && e.status !== "تمت المعالجة" && e.status !== "مؤرشف"
    ).length;

    const hasFieldData = cZones.length > 0;
    const needsAttention = urgentOpen > 0 || sentimentCounts["سلبي"] > sentimentCounts["إيجابي"];

    return {
      commune: c,
      hasFieldData,
      ranking,
      ourPresenceAvg,
      zonesCount: cZones.length,
      sentimentCounts,
      urgentOpen,
      digitalTotal: cEntries.length,
      needsAttention,
    };
  });

  const totalUrgentOpen = communeRows.reduce((sum, r) => sum + r.urgentOpen, 0);
  const communesWithFieldData = communeRows.filter((r) => r.hasFieldData).length;

  const visibleRows = view === "attention" ? communeRows.filter((r) => r.needsAttention) : communeRows;

  return (
    <PageShell
      title="الترتيب التنافسي"
      subtitle="تقدير يومي مفترض لموقعنا مقابل الأحزاب المنافسة — يجمع حضور الأحياء واليقظة الرقمية (تقدير اجتهادي من الفريق، ماشي استطلاع علمي)"
      icon={<IconChart />}
    >
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 mb-6 flex items-center justify-between flex-wrap gap-4 shadow-sm">
        <div>
          <div className="text-sm font-bold text-[var(--muted)]">جماعات فيها بيانات ميدانية</div>
          <div className="text-[28px] font-extrabold text-[var(--heading)]">
            {communesWithFieldData} / {communes.length}
          </div>
        </div>
        <div className="text-sm text-[var(--muted)]">
          {totalUrgentOpen > 0 ? (
            <span className="font-bold" style={{ color: "var(--severity-high)" }}>
              {totalUrgentOpen} إشارة عاجلة بدون معالجة (كل الجماعات)
            </span>
          ) : (
            "لا توجد إشارات عاجلة معلقة حاليا"
          )}
        </div>
      </div>

      {unassignedEntries.length > 0 && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 mb-6 text-sm text-[var(--muted)]">
          {unassignedEntries.length} تسجيل يقظة رقمية بلا جماعة محددة — ماشي محسوبين فالترتيب أسفله.
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
          تحتاج انتباه ({communeRows.filter((r) => r.needsAttention).length})
        </a>
        <a
          href="/ranking?view=all"
          className={`text-sm rounded-full px-4 py-2 border font-bold shadow-sm ${
            view === "all"
              ? "bg-[var(--brand-blue)] text-white border-[var(--brand-blue)]"
              : "border-[var(--border)] bg-[var(--card)] text-[var(--text)]"
          }`}
        >
          كل الجماعات ({communes.length})
        </a>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {visibleRows.map((r) => (
          <div key={r.commune.id} className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <div className="font-extrabold text-[16px] text-[var(--heading)]">{r.commune.name}</div>
                <div className="text-sm text-[var(--muted)] mt-0.5">
                  {r.commune.type}
                  {r.commune.leading_party_2021 ? ` · خط أساس 2021: ${r.commune.leading_party_2021} (${r.commune.leading_party_pct_2021}%)` : ""}
                </div>
              </div>
              {r.urgentOpen > 0 && (
                <span
                  className="text-xs font-extrabold rounded-full px-3 py-1.5 text-white shrink-0"
                  style={{ background: "var(--severity-high)" }}
                >
                  {r.urgentOpen} عاجل
                </span>
              )}
            </div>

            {r.hasFieldData ? (
              <div className="mb-3">
                <div className="text-xs font-bold text-[var(--muted)] mb-1.5">
                  ترتيب مفترض حسب عدد المكاتب/الأحياء المرصودة ({r.zonesCount} حي مُدخل)
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
                    متوسط نسبة حضورنا فالأحياء المُدخلة: {r.ourPresenceAvg.toFixed(0)}%
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-[var(--muted)] mb-3">
                لا توجد بيانات حضور أحياء مُدخلة بعد لهاد الجماعة — الترتيب المفترض مؤجل لحين تعبئة{" "}
                <a href="/presence" className="text-[var(--brand-blue)] underline">خريطة الحضور</a>.
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
                    {" · اليقظة الرقمية"}
                  </>
                ) : (
                  "بلا تسجيلات يقظة رقمية بعد"
                )}
              </span>
              <a href={`/digital-watch`} className="text-[var(--brand-blue)] font-semibold underline">
                عرض التسجيلات ↗
              </a>
            </div>
          </div>
        ))}
        {visibleRows.length === 0 && (
          <p className="text-[15px] text-[var(--muted)] md:col-span-2">
            {view === "attention" ? "ماكاينش جماعات محتاجة انتباه دابا — الوضع مستقر." : "ماكاينش جماعات."}
          </p>
        )}
      </div>
    </PageShell>
  );
}
