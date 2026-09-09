import Link from "next/link";
import PageShell from "@/components/PageShell";
import CopyButton from "@/components/CopyButton";
import AnalyzeButton from "@/components/AnalyzeButton";
import { createClient } from "@/lib/supabase/server";
import {
  PLATFORM_LABEL,
  SEVERITY_COLOR,
  SEVERITY_LABEL,
  severityOf,
  type Severity,
} from "@/lib/severity";

export const dynamic = "force-dynamic";

const SEVERITY_TABS: (Severity | "all")[] = ["all", "high", "medium", "neutral", "pending"];
const PLATFORM_TABS = ["all", ...Object.keys(PLATFORM_LABEL)];

export default async function MentionsPage({
  searchParams,
}: {
  searchParams: Promise<{ severity?: string; platform?: string }>;
}) {
  const params = await searchParams;
  const severityFilter = (params.severity ?? "all") as Severity | "all";
  const platformFilter = params.platform ?? "all";

  const supabase = await createClient();
  const { data } = await supabase
    .from("mentions")
    .select(
      "id, title, content, url, platform, collector_channel, entry_method, region_relevant, threat_score, threat_score_reason, threat_confidence, threat_model_used, analyzed_at, response_type:suggested_response_type, response_draft:suggested_response_text, collected_at"
    )
    .order("collected_at", { ascending: false })
    .limit(1000);

  const all = data ?? [];
  const withSeverity = all.map((m) => ({ ...m, severity: severityOf(m) }));

  const counts = { all: withSeverity.length } as Record<string, number>;
  for (const tab of SEVERITY_TABS) if (tab !== "all") counts[tab] = 0;
  for (const m of withSeverity) counts[m.severity]++;

  const platformCounts: Record<string, number> = { all: withSeverity.length };
  for (const m of withSeverity)
    platformCounts[m.platform ?? "other"] = (platformCounts[m.platform ?? "other"] ?? 0) + 1;

  const filtered = withSeverity.filter(
    (m) =>
      (severityFilter === "all" || m.severity === severityFilter) &&
      (platformFilter === "all" || m.platform === platformFilter)
  );

  return (
    <PageShell title="الإشارات">
      <p className="text-sm text-[var(--muted)] mb-4">
        أخر 50 إشارة مجمعة أو مُدخلة يدويا
      </p>

      <div className="flex justify-between items-center gap-3 flex-wrap mb-4">
        <div className="flex gap-2 flex-wrap">
          <Link
            href="/mentions/new"
            className="text-sm rounded-lg bg-[var(--brand-blue)] text-white px-4 py-2"
          >
            + إدخال يدوي
          </Link>
          <AnalyzeButton pendingCount={counts.pending ?? 0} />
        </div>
      </div>

      <div className="flex gap-2 flex-wrap mb-4">
        {SEVERITY_TABS.map((tab) => (
          <Link
            key={tab}
            href={`/mentions?severity=${tab}&platform=${platformFilter}`}
            className={`text-sm rounded-full px-3 py-1 border ${
              severityFilter === tab
                ? "bg-[var(--brand-blue)] text-white border-[var(--brand-blue)]"
                : "border-[var(--border)]"
            }`}
          >
            {tab === "all" ? "الكل" : SEVERITY_LABEL[tab]} ({counts[tab] ?? 0})
          </Link>
        ))}
      </div>

      <div className="flex gap-2 flex-wrap mb-6">
        {PLATFORM_TABS.map((tab) => (
          <Link
            key={tab}
            href={`/mentions?severity=${severityFilter}&platform=${tab}`}
            className={`text-xs rounded-full px-3 py-1 border ${
              platformFilter === tab
                ? "bg-[var(--brand-navy)] text-white border-[var(--brand-navy)]"
                : "border-[var(--border)] text-[var(--muted)]"
            }`}
          >
            {tab === "all" ? "كل المنصات" : PLATFORM_LABEL[tab]} ({platformCounts[tab] ?? 0})
          </Link>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.map((m) => (
          <div key={m.id} className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
            <div className="flex justify-between items-start gap-3 mb-2">
              <div className="flex gap-2 items-center flex-wrap">
                <span
                  className="text-xs rounded-full px-2 py-0.5 text-white"
                  style={{ background: SEVERITY_COLOR[m.severity] }}
                >
                  {SEVERITY_LABEL[m.severity]}
                </span>
                <span className="text-xs rounded-full px-2 py-0.5 border border-[var(--border)]">
                  {PLATFORM_LABEL[m.platform ?? "other"] ?? m.platform}
                </span>
                {m.entry_method === "manual" && (
                  <span className="text-xs rounded-full px-2 py-0.5 border border-[var(--border)] text-[var(--muted)]">
                    إدخال يدوي
                  </span>
                )}
                {m.analyzed_at && m.region_relevant === false && (
                  <span className="text-xs rounded-full px-2 py-0.5 border border-[var(--border)] text-[var(--muted)]">
                    خارج النطاق
                  </span>
                )}
              </div>
              <span className="text-xs text-[var(--muted)] shrink-0">
                {new Date(m.collected_at).toLocaleString("ar-MA")}
              </span>
            </div>
            <h3 className="font-medium mb-1">{m.title || "(بلا عنوان)"}</h3>
            {m.content && (
              <p className="text-sm text-[var(--muted)] line-clamp-3 mb-2">{m.content}</p>
            )}
            {m.threat_score_reason && (
              <p className="text-xs text-[var(--muted)] mb-2">
                <strong>لماذا هذا التقييم:</strong>{" "}
                {m.threat_model_used && <span>({m.threat_model_used}) </span>}
                {m.threat_score_reason}
              </p>
            )}
            <div className="flex gap-3 items-center text-xs">
              {m.url && (
                <a href={m.url} target="_blank" className="text-[var(--brand-blue)] underline">
                  فتح الرابط الأصلي
                </a>
              )}
            </div>
            {m.response_draft && (
              <div className="mt-3 rounded-lg bg-[var(--surface)] p-3">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-medium">
                    اقتراح رد ({m.response_type}) — مسودة، المراجعة والنشر يدويان
                  </span>
                  <CopyButton text={m.response_draft} />
                </div>
                <p className="text-sm whitespace-pre-wrap">{m.response_draft}</p>
              </div>
            )}
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="text-sm text-[var(--muted)]">ماكاينش إشارات تطابق هاد الفلترة.</p>
        )}
      </div>
    </PageShell>
  );
}
