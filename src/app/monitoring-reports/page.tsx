import PageShell from "@/components/PageShell";
import { createClient } from "@/lib/supabase/server";
import { addMonitoringReport, updateReportStatus, deleteReport, reviewReport } from "./actions";
import { IconShield } from "@/components/icons";
import ListSearch from "@/components/ListSearch";
import { getDictionary } from "@/lib/i18n/getDictionary";

export const dynamic = "force-dynamic";

const REPORT_TYPES = ["سير عادي", "مخالفة", "حادث", "ملاحظة عامة"];
const SEVERITIES = ["عادي", "متوسط", "خطير"];
const STATUS_TABS = ["all", "جديد", "قيد المراجعة", "تمت المعالجة", "مؤرشف"];
const STATUS_COLOR: Record<string, string> = {
  "جديد": "var(--severity-high)",
  "قيد المراجعة": "var(--severity-medium)",
  "تمت المعالجة": "var(--severity-neutral)",
  "مؤرشف": "var(--muted)",
};
const SEVERITY_COLOR: Record<string, string> = {
  "عادي": "var(--severity-neutral)",
  "متوسط": "var(--severity-medium)",
  "خطير": "var(--severity-high)",
};

export default async function MonitoringReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; severity?: string }>;
}) {
  const params = await searchParams;
  const statusFilter = params.status ?? "all";
  const severityFilter = params.severity ?? "all";

  const { dict, locale } = await getDictionary();
  const dateLocale = locale === "fr" ? "fr-FR" : "ar-MA";
  const REPORT_TYPE_LABEL: Record<string, string> = {
    "سير عادي": dict.monitoringReports.reportTypeNormal,
    "مخالفة": dict.monitoringReports.reportTypeViolation,
    "حادث": dict.monitoringReports.reportTypeIncident,
    "ملاحظة عامة": dict.monitoringReports.reportTypeGeneralNote,
  };
  const SEVERITY_LABEL: Record<string, string> = {
    "عادي": dict.monitoringReports.severityNormal,
    "متوسط": dict.monitoringReports.severityMedium,
    "خطير": dict.monitoringReports.severitySevere,
  };
  const STATUS_LABEL: Record<string, string> = {
    "جديد": dict.monitoringReports.statusNew,
    "قيد المراجعة": dict.monitoringReports.statusUnderReview,
    "تمت المعالجة": dict.monitoringReports.statusProcessed,
    "مؤرشف": dict.monitoringReports.statusArchived,
  };

  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);

  const [{ data: communes }, { data: stationsRaw }, { data: reportsRaw }] = await Promise.all([
    supabase.from("communes").select("id, name").order("name"),
    supabase
      .from("polling_stations")
      .select("id, center_name, commune_id, communes(name)")
      .order("center_name"),
    supabase
      .from("monitoring_reports")
      .select(
        "id, title, description, report_type, severity, status, reporter_name, review_notes, reported_at, commune_id, polling_station_id, communes(name), polling_stations(center_name)"
      )
      .order("reported_at", { ascending: false }),
  ]);

  const allCommunes = (communes ?? []) as { id: string; name: string }[];
  const stations = (stationsRaw ?? []) as any[];
  const reports = (reportsRaw ?? []) as any[];

  const filteredReports = reports.filter((r) => {
    if (statusFilter !== "all" && r.status !== statusFilter) return false;
    if (severityFilter !== "all" && r.severity !== severityFilter) return false;
    return true;
  });

  const statusCounts: Record<string, number> = { all: reports.length };
  for (const s of STATUS_TABS) if (s !== "all") statusCounts[s] = 0;
  for (const r of reports) statusCounts[r.status] = (statusCounts[r.status] ?? 0) + 1;

  const todayCount = reports.filter((r) => r.reported_at?.slice(0, 10) === today).length;
  const openSevereCount = reports.filter(
    (r) => r.severity === "خطير" && r.status !== "تمت المعالجة" && r.status !== "مؤرشف"
  ).length;
  const violationsCount = reports.filter((r) => r.report_type === "مخالفة").length;

  return (
    <PageShell
      title={dict.monitoringReports.title}
      subtitle={dict.monitoringReports.subtitle}
      icon={<IconShield />}
    >
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-6 py-4 shadow-sm">
          <div className="text-2xl font-extrabold text-[var(--heading)]">{todayCount}</div>
          <div className="text-sm font-bold text-[var(--muted)]">{dict.monitoringReports.statTodayReports}</div>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-6 py-4 shadow-sm">
          <div className="text-2xl font-extrabold text-[var(--heading)]">{reports.length}</div>
          <div className="text-sm font-bold text-[var(--muted)]">{dict.monitoringReports.statTotalReports}</div>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-6 py-4 shadow-sm">
          <div className="text-2xl font-extrabold text-[var(--heading)]">{violationsCount}</div>
          <div className="text-sm font-bold text-[var(--muted)]">{dict.monitoringReports.statViolationsRecorded}</div>
        </div>
        <div
          className="rounded-xl border px-6 py-4 shadow-sm"
          style={{ borderColor: "var(--severity-high)", background: "var(--card)" }}
        >
          <div className="text-2xl font-extrabold" style={{ color: "var(--severity-high)" }}>
            {openSevereCount}
          </div>
          <div className="text-sm font-bold text-[var(--muted)]">{dict.monitoringReports.statOpenSevere}</div>
        </div>
      </div>

      <section className="mb-8 rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm">
        <h2 className="text-lg font-extrabold mb-4 text-[var(--heading)]">{dict.monitoringReports.addReportTitle}</h2>
        <form action={addMonitoringReport} className="grid grid-cols-2 gap-3 mb-2">
          <input
            name="title"
            required
            placeholder={dict.monitoringReports.reportTitlePlaceholder}
            className="col-span-2 rounded-lg border border-[var(--border)] px-3.5 py-2.5 text-[15px] bg-[var(--bg)] focus:border-[var(--brand-blue)] focus:outline-none"
          />
          <textarea
            name="description"
            placeholder={dict.monitoringReports.descriptionPlaceholder}
            rows={2}
            className="col-span-2 rounded-lg border border-[var(--border)] px-3.5 py-2.5 text-[15px] bg-[var(--bg)] focus:border-[var(--brand-blue)] focus:outline-none"
          />
          <select
            name="report_type"
            defaultValue="ملاحظة عامة"
            className="rounded-lg border border-[var(--border)] px-3.5 py-2.5 text-[15px] bg-[var(--bg)]"
          >
            {REPORT_TYPES.map((t) => (
              <option key={t} value={t}>
                {REPORT_TYPE_LABEL[t] ?? t}
              </option>
            ))}
          </select>
          <select
            name="severity"
            defaultValue="عادي"
            className="rounded-lg border border-[var(--border)] px-3.5 py-2.5 text-[15px] bg-[var(--bg)]"
          >
            {SEVERITIES.map((s) => (
              <option key={s} value={s}>
                {SEVERITY_LABEL[s] ?? s}
              </option>
            ))}
          </select>
          <select
            name="polling_station_id"
            defaultValue=""
            className="rounded-lg border border-[var(--border)] px-3.5 py-2.5 text-[15px] bg-[var(--bg)]"
          >
            <option value="">{dict.monitoringReports.noStationOption}</option>
            {stations.map((s) => (
              <option key={s.id} value={s.id}>
                {s.communes?.name ? `${s.communes.name} · ` : ""}
                {s.center_name}
              </option>
            ))}
          </select>
          <select
            name="commune_id"
            defaultValue=""
            className="rounded-lg border border-[var(--border)] px-3.5 py-2.5 text-[15px] bg-[var(--bg)]"
          >
            <option value="">{dict.monitoringReports.noCommuneOption}</option>
            {allCommunes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <input
            name="reporter_name"
            placeholder={dict.monitoringReports.reporterNamePlaceholder}
            className="col-span-2 rounded-lg border border-[var(--border)] px-3.5 py-2.5 text-[15px] bg-[var(--bg)] focus:border-[var(--brand-blue)] focus:outline-none"
          />
          <button className="col-span-2 rounded-lg bg-[var(--brand-blue)] text-white font-bold px-4 py-2.5 hover:bg-[var(--brand-blue-hover)] transition">
            {dict.monitoringReports.addReportButton}
          </button>
        </form>
      </section>

      <div className="flex gap-2 flex-wrap mb-3">
        {STATUS_TABS.map((tab) => (
          <a
            key={tab}
            href={`/monitoring-reports?status=${tab}&severity=${severityFilter}`}
            className={`text-sm rounded-full px-4 py-2 border font-bold shadow-sm ${
              statusFilter === tab
                ? "bg-[var(--brand-blue)] text-white border-[var(--brand-blue)]"
                : "border-[var(--border)] bg-[var(--card)] text-[var(--text)]"
            }`}
          >
            {tab === "all" ? dict.common.all : STATUS_LABEL[tab]} ({statusCounts[tab] ?? 0})
          </a>
        ))}
      </div>
      <div className="flex gap-2 flex-wrap mb-6">
        <a
          href={`/monitoring-reports?status=${statusFilter}&severity=all`}
          className={`text-sm rounded-full px-3.5 py-1.5 border font-semibold ${
            severityFilter === "all"
              ? "bg-[var(--brand-navy)] text-white border-[var(--brand-navy)]"
              : "border-[var(--border)] text-[var(--muted)] bg-[var(--card)]"
          }`}
        >
          {dict.monitoringReports.allSeveritiesLabel}
        </a>
        {SEVERITIES.map((s) => (
          <a
            key={s}
            href={`/monitoring-reports?status=${statusFilter}&severity=${encodeURIComponent(s)}`}
            className={`text-sm rounded-full px-3.5 py-1.5 border font-semibold ${
              severityFilter === s
                ? "bg-[var(--brand-navy)] text-white border-[var(--brand-navy)]"
                : "border-[var(--border)] text-[var(--muted)] bg-[var(--card)]"
            }`}
          >
            {SEVERITY_LABEL[s] ?? s}
          </a>
        ))}
      </div>

      <ListSearch scopeId="monitoring-reports-list" placeholder={dict.monitoringReports.searchPlaceholder} dict={dict} locale={locale} />
      <div id="monitoring-reports-list" className="grid md:grid-cols-2 gap-4">
        {filteredReports.map((r) => (
          <div key={r.id} data-search-item className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3 mb-2">
              <div>
                <div className="text-sm font-bold text-[var(--muted)]">
                  {new Date(r.reported_at).toLocaleString(dateLocale, {
                    day: "numeric",
                    month: "long",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                  {" · "}
                  {REPORT_TYPE_LABEL[r.report_type] ?? r.report_type}
                  {r.communes?.name ? ` · ${r.communes.name}` : ""}
                  {r.polling_stations?.center_name ? ` · ${r.polling_stations.center_name}` : ""}
                  {r.reporter_name ? ` · ${r.reporter_name}` : ""}
                </div>
              </div>
              <div className="flex gap-1.5 shrink-0">
                <span
                  className="text-xs font-extrabold rounded-full px-3 py-1.5 text-white"
                  style={{ background: SEVERITY_COLOR[r.severity] }}
                >
                  {SEVERITY_LABEL[r.severity] ?? r.severity}
                </span>
                <span
                  className="text-xs font-extrabold rounded-full px-3 py-1.5 text-white"
                  style={{ background: STATUS_COLOR[r.status] }}
                >
                  {STATUS_LABEL[r.status] ?? r.status}
                </span>
              </div>
            </div>
            <p className="text-[15px] font-bold text-[var(--text)] mb-1">{r.title}</p>
            {r.description && <p className="text-sm text-[var(--muted)] mb-2 leading-relaxed">{r.description}</p>}
            {r.review_notes && (
              <div className="text-sm rounded-lg bg-[var(--bg)] border border-[var(--border)] px-3 py-2 mb-2">
                <span className="font-bold text-[var(--text)]">{dict.monitoringReports.reviewNoteLabel}</span>
                <span className="text-[var(--muted)]">{r.review_notes}</span>
              </div>
            )}

            <div className="flex gap-2 flex-wrap items-center pt-3 border-t border-[var(--border)] mt-3">
              {STATUS_TABS.filter((s) => s !== "all").map((s) => (
                <form key={s} action={updateReportStatus.bind(null, r.id, s)}>
                  <button
                    className={`text-xs font-bold rounded-full px-3 py-1.5 border ${
                      r.status === s ? "border-transparent text-white" : "border-[var(--border)] text-[var(--muted)]"
                    }`}
                    style={r.status === s ? { background: STATUS_COLOR[s] } : undefined}
                  >
                    {STATUS_LABEL[s]}
                  </button>
                </form>
              ))}
              <form action={deleteReport.bind(null, r.id)}>
                <button
                  className="text-xs font-bold rounded-full px-3 py-1.5"
                  style={{ background: "var(--severity-high)", color: "white" }}
                >
                  {dict.monitoringReports.deleteButton}
                </button>
              </form>
            </div>

            {r.status !== "تمت المعالجة" && (
              <details className="mt-3">
                <summary className="cursor-pointer text-sm font-bold text-[var(--brand-blue)]">
                  {dict.monitoringReports.reviewAndCloseSummary}
                </summary>
                <form action={reviewReport.bind(null, r.id)} className="flex gap-2 mt-2">
                  <input
                    name="review_notes"
                    placeholder={dict.monitoringReports.reviewNotesPlaceholder}
                    className="flex-1 rounded-lg border border-[var(--border)] px-2.5 py-1.5 text-sm bg-[var(--bg)]"
                  />
                  <button className="text-xs font-bold rounded-full px-3.5 py-1.5 text-white shrink-0" style={{ background: "var(--severity-neutral)" }}>
                    {dict.monitoringReports.markProcessedButton}
                  </button>
                </form>
              </details>
            )}
          </div>
        ))}
        {filteredReports.length === 0 && (
          <p className="text-[15px] text-[var(--muted)] md:col-span-2">{dict.monitoringReports.noMatch}</p>
        )}
      </div>
    </PageShell>
  );
}
