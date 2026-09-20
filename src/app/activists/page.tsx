import PageShell from "@/components/PageShell";
import { createClient } from "@/lib/supabase/server";
import { addActivist, updateActivistStatus, deleteActivist } from "./actions";
import { IconIdBadge } from "@/components/icons";
import ListSearch from "@/components/ListSearch";
import { getDictionary } from "@/lib/i18n/getDictionary";

export const dynamic = "force-dynamic";

const STATUS_TABS = ["نشيط", "فالانتظار", "غير نشيط"];
const STATUS_COLOR: Record<string, string> = {
  "نشيط": "var(--severity-neutral)",
  "فالانتظار": "var(--severity-medium)",
  "غير نشيط": "#9ca3af",
};

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "؟";
  if (parts.length === 1) return parts[0].slice(0, 1);
  return `${parts[0].slice(0, 1)}${parts[1].slice(0, 1)}`;
}

export default async function ActivistsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; commune?: string }>;
}) {
  const params = await searchParams;
  const statusFilter = params.status ?? "all";
  const communeFilter = params.commune ?? "all";

  const { dict, locale } = await getDictionary();
  const STATUS_LABEL: Record<string, string> = {
    "نشيط": dict.volunteers.statusActive,
    "فالانتظار": dict.volunteers.statusPending,
    "غير نشيط": dict.volunteers.statusInactive,
  };

  const supabase = await createClient();

  const [{ data: communes }, { data: activistsRaw }] = await Promise.all([
    supabase.from("communes").select("id, name").order("name"),
    supabase
      .from("activists")
      .select(
        "id, full_name, phone, email, membership_number, local_branch, responsibility, status, notes, joined_at, commune_id, communes(name)"
      )
      .order("joined_at", { ascending: false }),
  ]);

  const activists = activistsRaw ?? [];

  const filtered = (activists as any[]).filter((a) => {
    const communeName = a.communes?.name;
    return (
      (statusFilter === "all" || a.status === statusFilter) &&
      (communeFilter === "all" || communeName === communeFilter)
    );
  });

  const statusCounts: Record<string, number> = { all: activists.length };
  for (const s of STATUS_TABS) statusCounts[s] = 0;
  for (const a of activists as any[]) statusCounts[a.status] = (statusCounts[a.status] ?? 0) + 1;

  return (
    <PageShell
      title={dict.activists.title}
      subtitle={dict.activists.subtitle}
      icon={<IconIdBadge />}
    >
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 mb-6 flex items-center gap-6 flex-wrap shadow-sm">
        <div>
          <div className="text-sm font-bold text-[var(--muted)]">{dict.activists.statTotalActivists}</div>
          <div className="text-[28px] font-extrabold text-[var(--heading)]">{activists.length}</div>
        </div>
        <div>
          <div className="text-sm font-bold text-[var(--muted)]">{dict.volunteers.statActive}</div>
          <div className="text-[28px] font-extrabold" style={{ color: "var(--severity-neutral)" }}>
            {statusCounts["نشيط"] ?? 0}
          </div>
        </div>
      </div>

      <section className="mb-8 rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm">
        <h2 className="text-lg font-extrabold mb-4 text-[var(--heading)]">{dict.activists.addActivistTitle}</h2>
        <form action={addActivist} className="grid grid-cols-2 gap-3">
          <input
            name="full_name"
            placeholder={dict.volunteers.fullNamePlaceholder}
            required
            className="rounded-lg border border-[var(--border)] px-3.5 py-2.5 text-[15px] bg-[var(--bg)] focus:border-[var(--brand-blue)] focus:outline-none"
          />
          <input
            name="phone"
            placeholder={dict.volunteers.phonePlaceholder}
            className="rounded-lg border border-[var(--border)] px-3.5 py-2.5 text-[15px] bg-[var(--bg)] focus:border-[var(--brand-blue)] focus:outline-none"
          />
          <input
            name="email"
            placeholder={dict.volunteers.emailPlaceholder}
            className="rounded-lg border border-[var(--border)] px-3.5 py-2.5 text-[15px] bg-[var(--bg)] focus:border-[var(--brand-blue)] focus:outline-none"
          />
          <input
            name="membership_number"
            placeholder={dict.activists.membershipNumberPlaceholder}
            className="rounded-lg border border-[var(--border)] px-3.5 py-2.5 text-[15px] bg-[var(--bg)] focus:border-[var(--brand-blue)] focus:outline-none"
          />
          <select
            name="commune_id"
            defaultValue=""
            className="rounded-lg border border-[var(--border)] px-3.5 py-2.5 text-[15px] bg-[var(--bg)]"
          >
            <option value="">{dict.volunteers.communeOptionalOption}</option>
            {(communes ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <input
            name="local_branch"
            placeholder={dict.activists.localBranchPlaceholder}
            className="rounded-lg border border-[var(--border)] px-3.5 py-2.5 text-[15px] bg-[var(--bg)] focus:border-[var(--brand-blue)] focus:outline-none"
          />
          <input
            name="responsibility"
            placeholder={dict.activists.responsibilityPlaceholder}
            className="rounded-lg border border-[var(--border)] px-3.5 py-2.5 text-[15px] bg-[var(--bg)] focus:border-[var(--brand-blue)] focus:outline-none"
          />
          <input
            name="notes"
            placeholder={dict.volunteers.notesPlaceholder}
            className="rounded-lg border border-[var(--border)] px-3.5 py-2.5 text-[15px] bg-[var(--bg)] focus:border-[var(--brand-blue)] focus:outline-none"
          />
          <button className="col-span-2 rounded-lg bg-[var(--brand-blue)] text-white font-bold px-4 py-2.5 hover:bg-[var(--brand-blue-hover)] transition">
            {dict.activists.addActivistButton}
          </button>
        </form>
      </section>

      <div className="flex gap-2 flex-wrap mb-3">
        {["all", ...STATUS_TABS].map((tab) => (
          <a
            key={tab}
            href={`/activists?status=${tab}&commune=${communeFilter}`}
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
          href={`/activists?status=${statusFilter}&commune=all`}
          className={`text-sm rounded-full px-3.5 py-1.5 border font-semibold ${
            communeFilter === "all"
              ? "bg-[var(--brand-navy)] text-white border-[var(--brand-navy)]"
              : "border-[var(--border)] text-[var(--muted)] bg-[var(--card)]"
          }`}
        >
          {dict.pollingStations.allCommunes}
        </a>
        {(communes ?? []).map((c) => (
          <a
            key={c.id}
            href={`/activists?status=${statusFilter}&commune=${encodeURIComponent(c.name)}`}
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

      <ListSearch scopeId="activists-list" placeholder={dict.activists.searchPlaceholder} dict={dict} locale={locale} />
      <div id="activists-list" className="grid md:grid-cols-2 gap-4">
        {filtered.map((a: any) => (
          <div key={a.id} data-search-item className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm">
            <div className="flex items-start gap-3 mb-3">
              <div
                className="w-11 h-11 rounded-full flex items-center justify-center text-[14px] font-extrabold text-white shrink-0"
                style={{ background: STATUS_COLOR[a.status] ?? "#9ca3af" }}
              >
                {initials(a.full_name)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-extrabold text-[16px] text-[var(--heading)]">{a.full_name}</div>
                <div className="text-sm text-[var(--muted)] mt-0.5">
                  {a.phone ?? ""}
                  {a.phone && a.email ? " · " : ""}
                  {a.email ?? ""}
                  {a.membership_number ? ` ${dict.activists.membershipNumberInline} ${a.membership_number}` : ""}
                </div>
              </div>
              <span
                className="text-xs font-extrabold rounded-full px-3 py-1.5 text-white shrink-0"
                style={{ background: STATUS_COLOR[a.status] ?? "#9ca3af" }}
              >
                {STATUS_LABEL[a.status] ?? a.status}
              </span>
            </div>
            <div className="text-sm text-[var(--muted)] mb-2 leading-relaxed">
              {a.communes?.name && <span><b className="text-[var(--text)]">{a.communes.name}</b> · </span>}
              {a.local_branch && <span>{a.local_branch}</span>}
              {a.responsibility && <span> · {a.responsibility}</span>}
            </div>
            {a.notes && <p className="text-sm text-[var(--muted)] mb-2">{a.notes}</p>}
            <div className="flex gap-2 flex-wrap items-center pt-3 border-t border-[var(--border)] mt-3">
              {STATUS_TABS.map((s) => (
                <form key={s} action={updateActivistStatus.bind(null, a.id, s)}>
                  <button
                    className={`text-xs font-bold rounded-full px-3 py-1.5 border ${
                      a.status === s ? "border-transparent text-white" : "border-[var(--border)] text-[var(--muted)]"
                    }`}
                    style={a.status === s ? { background: STATUS_COLOR[s] } : undefined}
                  >
                    {STATUS_LABEL[s]}
                  </button>
                </form>
              ))}
              <form action={deleteActivist.bind(null, a.id)} className="mr-auto">
                <button
                  className="text-xs font-bold rounded-full px-3 py-1.5"
                  style={{ background: "var(--severity-high)", color: "white" }}
                >
                  {dict.volunteers.deleteButton}
                </button>
              </form>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="text-[15px] text-[var(--muted)] md:col-span-2">{dict.activists.noMatch}</p>
        )}
      </div>
    </PageShell>
  );
}
