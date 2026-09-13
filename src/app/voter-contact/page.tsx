import PageShell from "@/components/PageShell";
import { createClient } from "@/lib/supabase/server";
import { IconPhone } from "@/components/icons";
import {
  getCommuneContactSummary,
  getStationContactSummary,
  getStationVoters,
  statusMeta,
  STATUS_OPTIONS,
  VOTER_CONTACT_PAGE_SIZE,
} from "@/lib/voterContact";
import { setVoterContactStatus } from "./actions";

export const dynamic = "force-dynamic";

function pct(n: number, total: number) {
  if (!total) return "—";
  return `${Math.round((n / total) * 1000) / 10}%`;
}

export default async function VoterContactPage({
  searchParams,
}: {
  searchParams: Promise<{ commune?: string; station?: string; status?: string; page?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();

  // ------- مستوى 2: داخل مكتب تصويت محدد -------
  if (params.commune && params.station) {
    const statusFilter = params.status ?? "all";
    const page = Math.max(1, Number(params.page ?? "1") || 1);
    const { rows: voters, total } = await getStationVoters(supabase, params.station, statusFilter, page);
    const totalPages = Math.max(1, Math.ceil(total / VOTER_CONTACT_PAGE_SIZE));
    const baseUrl = `/voter-contact?commune=${params.commune}&station=${params.station}`;
    const redirectTo = `${baseUrl}&status=${statusFilter}&page=${page}`;

    return (
      <PageShell
        title="متابعة الفريق الميداني"
        subtitle="سجّل حالة التواصل مع كل ناخب داخل مكتب التصويت — تم التواصل، مؤيد، متردد، معارض، أو تعذر الوصول."
        icon={<IconPhone />}
      >
        <a href={`/voter-contact?commune=${params.commune}`} className="text-sm text-[var(--brand-blue)] font-bold underline mb-4 inline-block">
          ← رجوع لمكاتب التصويت
        </a>

        <div className="flex gap-2 flex-wrap mb-5">
          {["all", "not_contacted", ...STATUS_OPTIONS.map((s) => s.value)].map((s) => {
            const label = s === "all" ? "الكل" : s === "not_contacted" ? "غير متواصل بعد" : statusMeta(s)?.label ?? s;
            return (
              <a
                key={s}
                href={`${baseUrl}&status=${s}&page=1`}
                className={`text-sm rounded-full px-4 py-2 border font-bold shadow-sm ${
                  statusFilter === s
                    ? "bg-[var(--brand-blue)] text-white border-[var(--brand-blue)]"
                    : "border-[var(--border)] bg-[var(--card)] text-[var(--text)]"
                }`}
              >
                {label}
              </a>
            );
          })}
        </div>

        <div className="text-sm text-[var(--muted)] mb-3">{total.toLocaleString("ar")} ناخب فهاد الفلترة</div>

        <div className="space-y-2">
          {voters.map((v) => {
            const meta = statusMeta(v.status);
            return (
              <details key={v.id} className="rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-sm">
                <summary className="cursor-pointer flex items-center justify-between gap-3 p-4 list-none">
                  <div className="flex items-center gap-3">
                    <span className="font-extrabold text-[var(--heading)]">{v.initials}</span>
                    <span className="text-xs text-[var(--muted)]">#{v.id}</span>
                  </div>
                  <span
                    className="text-xs font-extrabold rounded-full px-3 py-1.5 text-white shrink-0"
                    style={{ background: meta?.color ?? "#9ca3af" }}
                  >
                    {meta?.label ?? "غير متواصل بعد"}
                  </span>
                </summary>
                <form action={setVoterContactStatus} className="px-4 pb-4 grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                  <input type="hidden" name="voter_id" value={v.id} />
                  <input type="hidden" name="commune_id" value={params.commune} />
                  <input type="hidden" name="polling_station_id" value={params.station} />
                  <input type="hidden" name="redirect_to" value={redirectTo} />
                  <select name="status" defaultValue={v.status ?? "contacted"} className="rounded-lg border border-[var(--border)] px-2.5 py-1.5 bg-[var(--bg)]">
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                  <select name="channel" defaultValue={v.channel ?? ""} className="rounded-lg border border-[var(--border)] px-2.5 py-1.5 bg-[var(--bg)]">
                    <option value="">القناة (اختياري)</option>
                    <option value="visit">زيارة</option>
                    <option value="phone_call">اتصال هاتفي</option>
                    <option value="other">أخرى</option>
                  </select>
                  <input
                    name="notes"
                    defaultValue={v.notes ?? ""}
                    placeholder="ملاحظة (اختياري)"
                    className="col-span-2 md:col-span-1 rounded-lg border border-[var(--border)] px-2.5 py-1.5 bg-[var(--bg)]"
                  />
                  <button className="rounded-lg bg-[var(--brand-navy)] text-white font-bold px-3.5 py-1.5 text-sm">
                    حفظ
                  </button>
                </form>
              </details>
            );
          })}
          {voters.length === 0 && <p className="text-[15px] text-[var(--muted)]">لا يوجد ناخبون فهاد الفلترة.</p>}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-6">
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
              .map((p, idx, arr) => (
                <span key={p} className="flex items-center gap-2">
                  {idx > 0 && arr[idx - 1] !== p - 1 && <span className="text-[var(--muted)]">…</span>}
                  <a
                    href={`${baseUrl}&status=${statusFilter}&page=${p}`}
                    className={`text-sm rounded-lg px-3 py-1.5 font-bold ${
                      p === page ? "bg-[var(--brand-blue)] text-white" : "border border-[var(--border)] bg-[var(--card)] text-[var(--text)]"
                    }`}
                  >
                    {p.toLocaleString("ar")}
                  </a>
                </span>
              ))}
          </div>
        )}
      </PageShell>
    );
  }

  // ------- مستوى 1: مكاتب التصويت داخل جماعة محددة -------
  if (params.commune) {
    const stations = await getStationContactSummary(supabase, params.commune);
    const { rows: communeRows } = await getCommuneContactSummary(supabase);
    const commune = communeRows.find((r) => r.commune.id === params.commune)?.commune;

    return (
      <PageShell
        title="متابعة الفريق الميداني"
        subtitle={`مكاتب التصويت — ${commune?.name ?? ""}`}
        icon={<IconPhone />}
      >
        <a href="/voter-contact" className="text-sm text-[var(--brand-blue)] font-bold underline mb-4 inline-block">
          ← رجوع لكل الجماعات
        </a>
        <div className="space-y-2">
          {stations.map((s) => (
            <a
              key={s.id}
              href={`/voter-contact?commune=${params.commune}&station=${s.id}`}
              className="block rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm hover:shadow-md transition"
            >
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <div className="font-extrabold text-[16px] text-[var(--heading)]">
                    {s.subOfficeNumber ? `مكتب ${s.subOfficeNumber} — ` : ""}
                    {s.centerName}
                  </div>
                  <div className="text-sm text-[var(--muted)] mt-0.5">{s.totalVoters.toLocaleString("ar")} ناخب</div>
                </div>
                <span
                  className="text-xs font-extrabold rounded-full px-3 py-1.5 text-white shrink-0"
                  style={{ background: s.contactedCount > 0 ? "var(--brand-blue)" : "#9ca3af" }}
                >
                  {s.contactedCount.toLocaleString("ar")} تم التواصل معاهم ({pct(s.contactedCount, s.totalVoters)})
                </span>
              </div>
            </a>
          ))}
          {stations.length === 0 && <p className="text-[15px] text-[var(--muted)]">لا توجد مكاتب تصويت حقيقية مُدخلة لهاد الجماعة.</p>}
        </div>
      </PageShell>
    );
  }

  // ------- مستوى 0: كل الجماعات -------
  const { rows, totals } = await getCommuneContactSummary(supabase);

  return (
    <PageShell
      title="متابعة الفريق الميداني"
      subtitle="حالة التواصل مع الناخبين، جماعة بجماعة — مبنية على قاعدة الناخبين (T-076)، بلا أسماء كاملة، فقط الحروف الأولى ومكتب التصويت."
      icon={<IconPhone />}
    >
      <div className="grid sm:grid-cols-3 gap-4 mb-6">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm">
          <div className="text-sm font-bold text-[var(--muted)]">إجمالي الناخبين</div>
          <div className="text-[28px] font-extrabold text-[var(--heading)]">{totals.totalVoters.toLocaleString("ar")}</div>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm">
          <div className="text-sm font-bold text-[var(--muted)]">تم التواصل معاهم ({pct(totals.contactedCount, totals.totalVoters)})</div>
          <div className="text-[28px] font-extrabold" style={{ color: "var(--brand-blue)" }}>
            {totals.contactedCount.toLocaleString("ar")}
          </div>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm">
          <div className="text-sm font-bold text-[var(--muted)]">مؤيدون مسجّلون</div>
          <div className="text-[28px] font-extrabold" style={{ color: "var(--severity-neutral)" }}>
            {totals.supporterCount.toLocaleString("ar")}
          </div>
        </div>
      </div>

      <div className="space-y-2">
        {rows.map((r) => (
          <a
            key={r.commune.id}
            href={`/voter-contact?commune=${r.commune.id}`}
            className="block rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm hover:shadow-md transition"
          >
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <div className="font-extrabold text-[16px] text-[var(--heading)]">{r.commune.name}</div>
                <div className="text-sm text-[var(--muted)] mt-0.5">{r.totalVoters.toLocaleString("ar")} ناخب</div>
              </div>
              <span
                className="text-xs font-extrabold rounded-full px-3 py-1.5 text-white shrink-0"
                style={{ background: r.contactedCount > 0 ? "var(--brand-blue)" : "#9ca3af" }}
              >
                {r.contactedCount.toLocaleString("ar")} تم التواصل ({pct(r.contactedCount, r.totalVoters)})
              </span>
            </div>
          </a>
        ))}
      </div>
    </PageShell>
  );
}
