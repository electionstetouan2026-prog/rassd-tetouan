import PageShell from "@/components/PageShell";
import { createClient } from "@/lib/supabase/server";
import { addDigitalWatchEntry, updateDigitalWatchStatus } from "./actions";
import { IconEye } from "@/components/icons";

export const dynamic = "force-dynamic";

const PLATFORMS = ["فيسبوك", "انستغرام", "تيك توك", "صحافة/موقع", "أخرى"];
const SENTIMENTS = ["إيجابي", "محايد", "سلبي"];
const PRIORITIES = ["عادي", "مهم", "عاجل"];
const STATUS_LABEL: Record<string, string> = {
  "جديد": "جديد",
  "قيد المعالجة": "قيد المعالجة",
  "تمت المعالجة": "تمت المعالجة",
  "مؤرشف": "مؤرشف",
};
const STATUS_COLOR: Record<string, string> = {
  "جديد": "var(--severity-high)",
  "قيد المعالجة": "var(--severity-medium)",
  "تمت المعالجة": "var(--severity-neutral)",
  "مؤرشف": "var(--muted)",
};
const STATUS_TABS = ["all", "جديد", "قيد المعالجة", "تمت المعالجة", "مؤرشف"];
const PRIORITY_COLOR: Record<string, string> = {
  "عادي": "var(--severity-neutral)",
  "مهم": "var(--severity-medium)",
  "عاجل": "var(--severity-high)",
};
const SENTIMENT_LABEL: Record<string, string> = {
  "إيجابي": "🟢 إيجابي",
  "محايد": "⚪ محايد",
  "سلبي": "🔴 سلبي",
};

export default async function DigitalWatchPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; priority?: string }>;
}) {
  const params = await searchParams;
  const statusFilter = params.status ?? "all";
  const priorityFilter = params.priority ?? "all";

  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);

  const [{ data: communes }, { data: entriesRaw }] = await Promise.all([
    supabase.from("communes").select("id, name").order("name"),
    supabase
      .from("digital_watch_entries")
      .select(
        "id, entry_date, platform, source_name, content_summary, content_url, attachment_url, sentiment, priority, status, notes, commune_id, communes(name)"
      )
      .order("entry_date", { ascending: false })
      .order("created_at", { ascending: false }),
  ]);

  const allCommunes = (communes ?? []) as { id: string; name: string }[];
  const entries = entriesRaw ?? [];

  const filteredEntries = entries.filter((e: any) => {
    if (statusFilter !== "all" && e.status !== statusFilter) return false;
    if (priorityFilter !== "all" && e.priority !== priorityFilter) return false;
    return true;
  });

  const statusCounts: Record<string, number> = { all: entries.length };
  for (const s of STATUS_TABS) if (s !== "all") statusCounts[s] = 0;
  for (const e of entries) statusCounts[e.status] = (statusCounts[e.status] ?? 0) + 1;

  const todayCount = entries.filter((e: any) => e.entry_date === today).length;
  const urgentOpenCount = entries.filter(
    (e: any) => e.priority === "عاجل" && e.status !== "تمت المعالجة" && e.status !== "مؤرشف"
  ).length;

  return (
    <PageShell
      title="اليقظة الرقمية"
      subtitle="تسجيل يدوي لما يُلاحظ فالفضاء الرقمي — فيسبوك، انستغرام، صحافة — مع أولوية ومتابعة الحالة"
      icon={<IconEye />}
    >
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 mb-6 flex items-center justify-between flex-wrap gap-4 shadow-sm">
        <div>
          <div className="text-sm font-bold text-[var(--muted)]">تسجيلات اليوم</div>
          <div className="text-[28px] font-extrabold text-[var(--heading)]">{todayCount} تسجيل</div>
        </div>
        <div className="text-sm text-[var(--muted)]">
          {urgentOpenCount > 0 ? (
            <span className="font-bold" style={{ color: "var(--severity-high)" }}>
              {urgentOpenCount} عاجل بدون معالجة
            </span>
          ) : (
            "لا توجد حالات عاجلة معلقة"
          )}
          {" · "}
          {entries.length} تسجيل مجموع
        </div>
      </div>

      <section className="mb-8 rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm">
        <h2 className="text-lg font-extrabold mb-4 text-[var(--heading)]">تسجيل ملاحظة جديدة</h2>
        <form action={addDigitalWatchEntry} className="grid grid-cols-2 gap-3 mb-2">
          <textarea
            name="content_summary"
            placeholder="ملخص المحتوى/الملاحظة (إجباري)"
            required
            rows={2}
            className="col-span-2 rounded-lg border border-[var(--border)] px-3.5 py-2.5 text-[15px] bg-[var(--bg)] focus:border-[var(--brand-blue)] focus:outline-none"
          />
          <input
            name="entry_date"
            type="date"
            defaultValue={today}
            className="rounded-lg border border-[var(--border)] px-3.5 py-2.5 text-[15px] bg-[var(--bg)]"
          />
          <select
            name="platform"
            defaultValue="أخرى"
            className="rounded-lg border border-[var(--border)] px-3.5 py-2.5 text-[15px] bg-[var(--bg)]"
          >
            {PLATFORMS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          <input
            name="source_name"
            placeholder="اسم الحساب/الصفحة/الموقع (اختياري)"
            className="rounded-lg border border-[var(--border)] px-3.5 py-2.5 text-[15px] bg-[var(--bg)] focus:border-[var(--brand-blue)] focus:outline-none"
          />
          <input
            name="content_url"
            placeholder="رابط المنشور/المقال (اختياري)"
            className="rounded-lg border border-[var(--border)] px-3.5 py-2.5 text-[15px] bg-[var(--bg)] focus:border-[var(--brand-blue)] focus:outline-none"
          />
          <input
            name="attachment_url"
            placeholder="رابط لقطة شاشة/PDF مرفوع خارجيا (اختياري)"
            className="rounded-lg border border-[var(--border)] px-3.5 py-2.5 text-[15px] bg-[var(--bg)] focus:border-[var(--brand-blue)] focus:outline-none"
          />
          <select
            name="commune_id"
            defaultValue=""
            className="rounded-lg border border-[var(--border)] px-3.5 py-2.5 text-[15px] bg-[var(--bg)]"
          >
            <option value="">— بلا جماعة محددة —</option>
            {allCommunes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select
            name="sentiment"
            defaultValue="محايد"
            className="rounded-lg border border-[var(--border)] px-3.5 py-2.5 text-[15px] bg-[var(--bg)]"
          >
            {SENTIMENTS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <select
            name="priority"
            defaultValue="عادي"
            className="rounded-lg border border-[var(--border)] px-3.5 py-2.5 text-[15px] bg-[var(--bg)]"
          >
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          <input
            name="notes"
            placeholder="ملاحظات إضافية (اختياري)"
            className="col-span-2 rounded-lg border border-[var(--border)] px-3.5 py-2.5 text-[15px] bg-[var(--bg)] focus:border-[var(--brand-blue)] focus:outline-none"
          />
          <button className="col-span-2 rounded-lg bg-[var(--brand-blue)] text-white font-bold px-4 py-2.5 hover:bg-[var(--brand-blue-hover)] transition">
            + تسجيل الملاحظة
          </button>
        </form>
      </section>

      <div className="flex gap-2 flex-wrap mb-3">
        {STATUS_TABS.map((tab) => (
          <a
            key={tab}
            href={`/digital-watch?status=${tab}&priority=${priorityFilter}`}
            className={`text-sm rounded-full px-4 py-2 border font-bold shadow-sm ${
              statusFilter === tab
                ? "bg-[var(--brand-blue)] text-white border-[var(--brand-blue)]"
                : "border-[var(--border)] bg-[var(--card)] text-[var(--text)]"
            }`}
          >
            {tab === "all" ? "الكل" : STATUS_LABEL[tab]} ({statusCounts[tab] ?? 0})
          </a>
        ))}
      </div>
      <div className="flex gap-2 flex-wrap mb-6">
        <a
          href={`/digital-watch?status=${statusFilter}&priority=all`}
          className={`text-sm rounded-full px-3.5 py-1.5 border font-semibold ${
            priorityFilter === "all"
              ? "bg-[var(--brand-navy)] text-white border-[var(--brand-navy)]"
              : "border-[var(--border)] text-[var(--muted)] bg-[var(--card)]"
          }`}
        >
          كل الأولويات
        </a>
        {PRIORITIES.map((p) => (
          <a
            key={p}
            href={`/digital-watch?status=${statusFilter}&priority=${encodeURIComponent(p)}`}
            className={`text-sm rounded-full px-3.5 py-1.5 border font-semibold ${
              priorityFilter === p
                ? "bg-[var(--brand-navy)] text-white border-[var(--brand-navy)]"
                : "border-[var(--border)] text-[var(--muted)] bg-[var(--card)]"
            }`}
          >
            {p}
          </a>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {filteredEntries.map((e: any) => (
          <div key={e.id} className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3 mb-2">
              <div>
                <div className="text-sm font-bold text-[var(--muted)]">
                  {new Date(e.entry_date).toLocaleDateString("ar-MA", { weekday: "long", day: "numeric", month: "long" })}
                  {" · "}
                  {e.platform}
                  {e.source_name ? ` · ${e.source_name}` : ""}
                  {e.communes?.name ? ` · ${e.communes.name}` : ""}
                </div>
              </div>
              <div className="flex gap-1.5 shrink-0">
                <span
                  className="text-xs font-extrabold rounded-full px-3 py-1.5 text-white"
                  style={{ background: PRIORITY_COLOR[e.priority] }}
                >
                  {e.priority}
                </span>
                <span
                  className="text-xs font-extrabold rounded-full px-3 py-1.5 text-white"
                  style={{ background: STATUS_COLOR[e.status] }}
                >
                  {STATUS_LABEL[e.status] ?? e.status}
                </span>
              </div>
            </div>
            <p className="text-[15px] text-[var(--text)] mb-2 leading-relaxed">{e.content_summary}</p>
            <div className="text-sm text-[var(--muted)] mb-2">{SENTIMENT_LABEL[e.sentiment] ?? e.sentiment}</div>
            {(e.content_url || e.attachment_url) && (
              <div className="flex gap-3 text-sm mb-2 flex-wrap">
                {e.content_url && (
                  <a href={e.content_url} target="_blank" rel="noreferrer" className="text-[var(--brand-blue)] font-semibold underline">
                    رابط المنشور ↗
                  </a>
                )}
                {e.attachment_url && (
                  <a href={e.attachment_url} target="_blank" rel="noreferrer" className="text-[var(--brand-blue)] font-semibold underline">
                    مرفق (لقطة/PDF) ↗
                  </a>
                )}
              </div>
            )}
            {e.notes && <p className="text-sm text-[var(--muted)] mb-2">{e.notes}</p>}
            <div className="flex gap-2 flex-wrap items-center pt-3 border-t border-[var(--border)] mt-3">
              {STATUS_TABS.filter((s) => s !== "all").map((s) => (
                <form key={s} action={updateDigitalWatchStatus.bind(null, e.id, s)}>
                  <button
                    className={`text-xs font-bold rounded-full px-3 py-1.5 border ${
                      e.status === s ? "border-transparent text-white" : "border-[var(--border)] text-[var(--muted)]"
                    }`}
                    style={e.status === s ? { background: STATUS_COLOR[s] } : undefined}
                  >
                    {STATUS_LABEL[s]}
                  </button>
                </form>
              ))}
            </div>
          </div>
        ))}
        {filteredEntries.length === 0 && (
          <p className="text-[15px] text-[var(--muted)] md:col-span-2">ماكاينش تسجيلات تطابق هاد الفلترة.</p>
        )}
      </div>
    </PageShell>
  );
}
