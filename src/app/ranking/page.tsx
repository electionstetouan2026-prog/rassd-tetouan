import PageShell from "@/components/PageShell";
import { createClient } from "@/lib/supabase/server";
import { IconChart } from "@/components/icons";
import { getRankingData } from "@/lib/ranking";
import { isGeminiConfigured } from "@/lib/ai/gemini";
import { generateRankingSummary } from "./actions";
import AiSummaryBox from "./AiSummaryBox";

export const dynamic = "force-dynamic";

const SENTIMENT_ICON: Record<string, string> = {
  "إيجابي": "🟢",
  "محايد": "⚪",
  "سلبي": "🔴",
};

export default async function RankingPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const params = await searchParams;
  const view = params.view ?? "attention"; // attention | all

  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);

  const [{ communes, communeRows, totalUrgentOpen, communesWithFieldData, unassignedEntries }, { data: todaySummary }] =
    await Promise.all([
      getRankingData(supabase),
      supabase.from("ranking_ai_summaries").select("summary_text, model, created_at").eq("summary_date", today).maybeSingle(),
    ]);

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

      <AiSummaryBox
        summaryText={todaySummary?.summary_text ?? null}
        model={todaySummary?.model ?? null}
        generatedAt={todaySummary?.created_at ?? null}
        aiEnabled={isGeminiConfigured()}
        onGenerate={generateRankingSummary}
      />

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
