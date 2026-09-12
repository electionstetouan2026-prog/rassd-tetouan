import PageShell from "@/components/PageShell";
import { createClient } from "@/lib/supabase/server";
import { addFieldTask, updateFieldTaskStatus } from "./actions";
import { IconTasks } from "@/components/icons";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  "مخطط": "مخطط",
  "جارية": "جارية",
  "منجزة": "منجزة",
  "ملغاة": "ملغاة",
};
const STATUS_COLOR: Record<string, string> = {
  "مخطط": "var(--severity-pending)",
  "جارية": "var(--severity-medium)",
  "منجزة": "var(--severity-neutral)",
  "ملغاة": "var(--severity-high)",
};
const STATUS_TABS = ["all", "مخطط", "جارية", "منجزة", "ملغاة"];

type Commune = { id: string; name: string };

export default async function FieldTasksPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; commune?: string; when?: string }>;
}) {
  const params = await searchParams;
  const statusFilter = params.status ?? "all";
  const communeFilter = params.commune ?? "all";
  const whenFilter = params.when ?? "upcoming"; // upcoming | all

  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);

  const [{ data: communes }, { data: tasksRaw }] = await Promise.all([
    supabase.from("communes").select("id, name").order("name"),
    supabase
      .from("field_tasks")
      .select("id, title, description, task_date, zone_name, team, status, notes, commune_id, communes(name)")
      .order("task_date", { ascending: true }),
  ]);

  const allCommunes = (communes ?? []) as Commune[];
  const tasks = tasksRaw ?? [];

  const filteredTasks = tasks.filter((t: any) => {
    const communeName = t.communes?.name;
    if (statusFilter !== "all" && t.status !== statusFilter) return false;
    if (communeFilter !== "all" && communeName !== communeFilter) return false;
    if (whenFilter === "upcoming" && t.task_date < today && t.status !== "جارية") return false;
    return true;
  });

  const statusCounts: Record<string, number> = { all: tasks.length };
  for (const s of STATUS_TABS) if (s !== "all") statusCounts[s] = 0;
  for (const t of tasks) statusCounts[t.status] = (statusCounts[t.status] ?? 0) + 1;

  const todayCount = tasks.filter((t: any) => t.task_date === today && t.status !== "ملغاة").length;
  const doneCount = statusCounts["منجزة"] ?? 0;

  return (
    <PageShell
      title="البرنامج الميداني"
      subtitle="مهام الفريق الميداني اليومية — توزيع، تعبئة، اجتماعات، حسب الجماعة والفريق"
      icon={<IconTasks />}
    >
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 mb-6 flex items-center justify-between flex-wrap gap-4 shadow-sm">
        <div>
          <div className="text-sm font-bold text-[var(--muted)]">مهام اليوم</div>
          <div className="text-[28px] font-extrabold text-[var(--heading)]">{todayCount} مهمة</div>
        </div>
        <div className="text-sm text-[var(--muted)]">
          {doneCount} منجزة من أصل {tasks.length} مهمة مسجّلة
        </div>
      </div>

      <section className="mb-8 rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm">
        <h2 className="text-lg font-extrabold mb-4 text-[var(--heading)]">إضافة مهمة</h2>
        <form action={addFieldTask} className="grid grid-cols-2 gap-3 mb-2">
          <input
            name="title"
            placeholder="عنوان المهمة"
            required
            className="col-span-2 rounded-lg border border-[var(--border)] px-3.5 py-2.5 text-[15px] bg-[var(--bg)] focus:border-[var(--brand-blue)] focus:outline-none"
          />
          <input
            name="task_date"
            type="date"
            defaultValue={today}
            className="rounded-lg border border-[var(--border)] px-3.5 py-2.5 text-[15px] bg-[var(--bg)]"
          />
          <input
            name="team"
            placeholder="الفريق/المسؤول (اختياري)"
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
          <input
            name="zone_name"
            placeholder="الحي/الدوار (اختياري)"
            className="rounded-lg border border-[var(--border)] px-3.5 py-2.5 text-[15px] bg-[var(--bg)] focus:border-[var(--brand-blue)] focus:outline-none"
          />
          <input
            name="description"
            placeholder="وصف المهمة (اختياري)"
            className="col-span-2 rounded-lg border border-[var(--border)] px-3.5 py-2.5 text-[15px] bg-[var(--bg)] focus:border-[var(--brand-blue)] focus:outline-none"
          />
          <button className="col-span-2 rounded-lg bg-[var(--brand-blue)] text-white font-bold px-4 py-2.5 hover:bg-[var(--brand-blue-hover)] transition">
            + إضافة مهمة
          </button>
        </form>
      </section>

      <div className="flex gap-2 flex-wrap mb-3">
        {STATUS_TABS.map((tab) => (
          <a
            key={tab}
            href={`/field-tasks?status=${tab}&commune=${communeFilter}&when=${whenFilter}`}
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
      <div className="flex gap-2 flex-wrap mb-3">
        <a
          href={`/field-tasks?status=${statusFilter}&commune=all&when=${whenFilter}`}
          className={`text-sm rounded-full px-3.5 py-1.5 border font-semibold ${
            communeFilter === "all"
              ? "bg-[var(--brand-navy)] text-white border-[var(--brand-navy)]"
              : "border-[var(--border)] text-[var(--muted)] bg-[var(--card)]"
          }`}
        >
          كل الجماعات
        </a>
        {allCommunes.map((c) => (
          <a
            key={c.id}
            href={`/field-tasks?status=${statusFilter}&commune=${encodeURIComponent(c.name)}&when=${whenFilter}`}
            className={`text-sm rounded-full px-3.5 py-1.5 border font-semibold ${
              communeFilter === c.name
                ? "bg-[var(--brand-navy)] text-white border-[var(--brand-navy)]"
                : "border-[var(--border)] text-[var(--muted)] bg-[var(--card)]"
            }`}
          >
            {c.name}
          </a>
        ))}
      </div>
      <div className="flex gap-2 flex-wrap mb-6">
        <a
          href={`/field-tasks?status=${statusFilter}&commune=${communeFilter}&when=upcoming`}
          className={`text-sm rounded-full px-3.5 py-1.5 border font-semibold ${
            whenFilter === "upcoming"
              ? "bg-[var(--brand-blue)] text-white border-[var(--brand-blue)]"
              : "border-[var(--border)] text-[var(--muted)] bg-[var(--card)]"
          }`}
        >
          القادمة/الجارية
        </a>
        <a
          href={`/field-tasks?status=${statusFilter}&commune=${communeFilter}&when=all`}
          className={`text-sm rounded-full px-3.5 py-1.5 border font-semibold ${
            whenFilter === "all"
              ? "bg-[var(--brand-blue)] text-white border-[var(--brand-blue)]"
              : "border-[var(--border)] text-[var(--muted)] bg-[var(--card)]"
          }`}
        >
          كل المهام (حتى الفائتة)
        </a>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {filteredTasks.map((t: any) => (
          <div key={t.id} className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3 mb-2">
              <div>
                <div className="font-extrabold text-[16px] text-[var(--heading)]">{t.title}</div>
                <div className="text-sm text-[var(--muted)] mt-0.5">
                  {new Date(t.task_date).toLocaleDateString("ar-MA", { weekday: "long", day: "numeric", month: "long" })}
                  {t.team ? ` · ${t.team}` : ""}
                </div>
              </div>
              <span
                className="text-xs font-extrabold rounded-full px-3 py-1.5 text-white shrink-0"
                style={{ background: STATUS_COLOR[t.status] }}
              >
                {STATUS_LABEL[t.status] ?? t.status}
              </span>
            </div>
            <div className="text-sm text-[var(--muted)] mb-2 leading-relaxed">
              {t.communes?.name || t.zone_name ? (
                <>
                  <b className="text-[var(--text)]">{t.communes?.name ?? "?"}</b>
                  {t.zone_name ? ` — ${t.zone_name}` : ""}
                </>
              ) : (
                "بلا نطاق جغرافي محدد"
              )}
            </div>
            {t.description && <p className="text-sm text-[var(--muted)] mb-2">{t.description}</p>}
            <div className="flex gap-2 flex-wrap items-center pt-3 border-t border-[var(--border)] mt-3">
              {STATUS_TABS.filter((s) => s !== "all").map((s) => (
                <form key={s} action={updateFieldTaskStatus.bind(null, t.id, s)}>
                  <button
                    className={`text-xs font-bold rounded-full px-3 py-1.5 border ${
                      t.status === s ? "border-transparent text-white" : "border-[var(--border)] text-[var(--muted)]"
                    }`}
                    style={t.status === s ? { background: STATUS_COLOR[s] } : undefined}
                  >
                    {STATUS_LABEL[s]}
                  </button>
                </form>
              ))}
            </div>
          </div>
        ))}
        {filteredTasks.length === 0 && (
          <p className="text-[15px] text-[var(--muted)] md:col-span-2">ماكاينش مهام تطابق هاد الفلترة.</p>
        )}
      </div>
    </PageShell>
  );
}
