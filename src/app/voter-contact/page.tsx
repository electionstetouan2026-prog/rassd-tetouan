import PageShell from "@/components/PageShell";
import { createClient } from "@/lib/supabase/server";
import { IconPhone } from "@/components/icons";
import {
  getCommuneContactSummary,
  getStationContactSummary,
  getStationVoters,
  getFieldTeam,
  statusMeta,
  STATUS_OPTIONS,
  VOTER_CONTACT_PAGE_SIZE,
} from "@/lib/voterContact";
import { setVoterContactStatus } from "./actions";
import { addVolunteer } from "@/app/volunteers/actions";
import ListSearch from "@/components/ListSearch";
import { getDictionary } from "@/lib/i18n/getDictionary";

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
  const { dict, locale } = await getDictionary();
  const numberLocale = locale === "fr" ? "fr-FR" : "ar";
  const STATUS_LABEL: Record<string, string> = {
    contacted: dict.voterContact.statusContacted,
    supporter: dict.voterContact.statusSupporter,
    undecided: dict.voterContact.statusUndecided,
    opponent: dict.voterContact.statusOpponent,
    unreachable: dict.voterContact.statusUnreachable,
  };

  // ------- مستوى 2: داخل مكتب تصويت محدد -------
  if (params.commune && params.station) {
    const statusFilter = params.status ?? "all";
    const page = Math.max(1, Number(params.page ?? "1") || 1);
    const { rows: voters, total } = await getStationVoters(supabase, params.station, statusFilter, page);
    const fieldTeam = await getFieldTeam(supabase, params.commune);
    const totalPages = Math.max(1, Math.ceil(total / VOTER_CONTACT_PAGE_SIZE));
    const baseUrl = `/voter-contact?commune=${params.commune}&station=${params.station}`;
    const redirectTo = `${baseUrl}&status=${statusFilter}&page=${page}`;

    return (
      <PageShell
        title={dict.voterContact.title}
        subtitle={dict.voterContact.subtitleStationLevel}
        icon={<IconPhone />}
      >
        <a href={`/voter-contact?commune=${params.commune}`} className="text-sm text-[var(--brand-blue)] font-bold underline mb-4 inline-block">
          {dict.voterContact.backToStations}
        </a>

        <div className="flex gap-2 flex-wrap mb-5">
          {["all", "not_contacted", ...STATUS_OPTIONS.map((s) => s.value)].map((s) => {
            const label = s === "all" ? dict.common.all : s === "not_contacted" ? dict.voterContact.notContactedYet : STATUS_LABEL[s] ?? s;
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

        <div className="text-sm text-[var(--muted)] mb-3">{total.toLocaleString(numberLocale)} {dict.voterContact.voterInFilterSuffix}</div>

        <ListSearch scopeId="station-voters-list" placeholder={dict.voterContact.searchInPagePlaceholder} dict={dict} locale={locale} />
        <div id="station-voters-list" className="space-y-2">
          {voters.map((v) => {
            const meta = statusMeta(v.status);
            return (
              <details key={v.id} data-search-item className="rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-sm">
                <summary className="cursor-pointer flex items-center justify-between gap-3 p-4 list-none">
                  <div className="flex items-center gap-3">
                    <span className="font-extrabold text-[var(--heading)]">{v.initials}</span>
                    <span className="text-xs text-[var(--muted)]">#{v.id}</span>
                    {v.contactedBy && <span className="text-xs text-[var(--muted)]">— {v.contactedBy}</span>}
                  </div>
                  <span
                    className="text-xs font-extrabold rounded-full px-3 py-1.5 text-white shrink-0"
                    style={{ background: meta?.color ?? "#9ca3af" }}
                  >
                    {(meta && STATUS_LABEL[meta.value]) ?? dict.voterContact.notContactedYet}
                  </span>
                </summary>
                <form action={setVoterContactStatus} className="px-4 pb-4 grid grid-cols-2 md:grid-cols-5 gap-2 text-sm">
                  <input type="hidden" name="voter_id" value={v.id} />
                  <input type="hidden" name="commune_id" value={params.commune} />
                  <input type="hidden" name="polling_station_id" value={params.station} />
                  <input type="hidden" name="redirect_to" value={redirectTo} />
                  <select name="status" defaultValue={v.status ?? "contacted"} className="rounded-lg border border-[var(--border)] px-2.5 py-1.5 bg-[var(--bg)]">
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s.value} value={s.value}>
                        {STATUS_LABEL[s.value] ?? s.label}
                      </option>
                    ))}
                  </select>
                  <select name="channel" defaultValue={v.channel ?? ""} className="rounded-lg border border-[var(--border)] px-2.5 py-1.5 bg-[var(--bg)]">
                    <option value="">{dict.voterContact.channelPlaceholder}</option>
                    <option value="visit">{dict.voterContact.channelVisit}</option>
                    <option value="phone_call">{dict.voterContact.channelPhoneCall}</option>
                    <option value="other">{dict.voterContact.channelOther}</option>
                  </select>
                  <select name="contacted_by" defaultValue={v.contactedBy ?? ""} className="rounded-lg border border-[var(--border)] px-2.5 py-1.5 bg-[var(--bg)]">
                    <option value="">{dict.voterContact.contactedByPlaceholder}</option>
                    {fieldTeam.map((m) => (
                      <option key={`${m.type}-${m.id}`} value={m.name}>
                        {m.name} {m.type === "activist" ? dict.voterContact.activistSuffix : dict.voterContact.volunteerSuffix}
                      </option>
                    ))}
                  </select>
                  <input
                    name="notes"
                    defaultValue={v.notes ?? ""}
                    placeholder={dict.voterContact.notesPlaceholder}
                    className="col-span-2 md:col-span-1 rounded-lg border border-[var(--border)] px-2.5 py-1.5 bg-[var(--bg)]"
                  />
                  <button className="rounded-lg bg-[var(--brand-navy)] text-white font-bold px-3.5 py-1.5 text-sm">
                    {dict.voterContact.saveButton}
                  </button>
                </form>
              </details>
            );
          })}
          {voters.length === 0 && <p className="text-[15px] text-[var(--muted)]">{dict.voterContact.noVotersInFilter}</p>}
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
                    {p.toLocaleString(numberLocale)}
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
        title={dict.voterContact.title}
        subtitle={`${dict.voterContact.stationsForCommunePrefix} ${commune?.name ?? ""}`}
        icon={<IconPhone />}
      >
        <a href="/voter-contact" className="text-sm text-[var(--brand-blue)] font-bold underline mb-4 inline-block">
          {dict.voterContact.backToAllCommunes}
        </a>
        <ListSearch scopeId="voter-contact-stations-list" placeholder={dict.voterContact.searchStationsPlaceholder} dict={dict} locale={locale} />
        <div id="voter-contact-stations-list" className="space-y-2">
          {stations.map((s) => (
            <a
              key={s.id}
              data-search-item
              href={`/voter-contact?commune=${params.commune}&station=${s.id}`}
              className="block rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm hover:shadow-md transition"
            >
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <div className="font-extrabold text-[16px] text-[var(--heading)]">
                    {s.subOfficeNumber ? `${dict.voterContact.officePrefix} ${s.subOfficeNumber} — ` : ""}
                    {s.centerName}
                  </div>
                  <div className="text-sm text-[var(--muted)] mt-0.5">{s.totalVoters.toLocaleString(numberLocale)} {dict.voterContact.votersUnit}</div>
                </div>
                <span
                  className="text-xs font-extrabold rounded-full px-3 py-1.5 text-white shrink-0"
                  style={{ background: s.contactedCount > 0 ? "var(--brand-blue)" : "#9ca3af" }}
                >
                  {s.contactedCount.toLocaleString(numberLocale)} {dict.voterContact.contactedWithThemSuffix} ({pct(s.contactedCount, s.totalVoters)})
                </span>
              </div>
            </a>
          ))}
          {stations.length === 0 && <p className="text-[15px] text-[var(--muted)]">{dict.voterContact.noRealStationsForCommune}</p>}
        </div>
      </PageShell>
    );
  }

  // ------- مستوى 0: كل الجماعات -------
  const { rows, totals } = await getCommuneContactSummary(supabase);
  const fieldTeam = await getFieldTeam(supabase);

  return (
    <PageShell
      title={dict.voterContact.title}
      subtitle={dict.voterContact.subtitleAllCommunes}
      icon={<IconPhone />}
    >
      <div className="grid sm:grid-cols-3 gap-4 mb-6">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm">
          <div className="text-sm font-bold text-[var(--muted)]">{dict.voterContact.statTotalVoters}</div>
          <div className="text-[28px] font-extrabold text-[var(--heading)]">{totals.totalVoters.toLocaleString(numberLocale)}</div>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm">
          <div className="text-sm font-bold text-[var(--muted)]">{dict.voterContact.contactedWithThemSuffix} ({pct(totals.contactedCount, totals.totalVoters)})</div>
          <div className="text-[28px] font-extrabold" style={{ color: "var(--brand-blue)" }}>
            {totals.contactedCount.toLocaleString(numberLocale)}
          </div>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm">
          <div className="text-sm font-bold text-[var(--muted)]">{dict.voterContact.statSupportersRegistered}</div>
          <div className="text-[28px] font-extrabold" style={{ color: "var(--severity-neutral)" }}>
            {totals.supporterCount.toLocaleString(numberLocale)}
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div>
          <ListSearch scopeId="voter-contact-communes-list" placeholder={dict.voterContact.searchCommunesPlaceholder} dict={dict} locale={locale} />
          <div id="voter-contact-communes-list" className="space-y-2">
            {rows.map((r) => (
              <a
                key={r.commune.id}
                data-search-item
                href={`/voter-contact?commune=${r.commune.id}`}
                className="block rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm hover:shadow-md transition"
              >
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <div className="font-extrabold text-[16px] text-[var(--heading)]">{r.commune.name}</div>
                    <div className="text-sm text-[var(--muted)] mt-0.5">{r.totalVoters.toLocaleString(numberLocale)} {dict.voterContact.votersUnit}</div>
                  </div>
                  <span
                    className="text-xs font-extrabold rounded-full px-3 py-1.5 text-white shrink-0"
                    style={{ background: r.contactedCount > 0 ? "var(--brand-blue)" : "#9ca3af" }}
                  >
                    {r.contactedCount.toLocaleString(numberLocale)} {dict.voterContact.contactedSuffix} ({pct(r.contactedCount, r.totalVoters)})
                  </span>
                </div>
              </a>
            ))}
          </div>
        </div>

        <aside className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm h-fit">
          <h2 className="font-extrabold text-[var(--heading)] mb-1">{dict.voterContact.fieldTeamTitle}</h2>
          <p className="text-xs text-[var(--muted)] mb-3">
            {dict.voterContact.fieldTeamDescPrefix}
            {" "}<a href="/volunteers" className="underline">{dict.voterContact.volunteersLinkLabel}</a>
            {locale === "fr" ? " et " : " و"}
            <a href="/activists" className="underline">{dict.voterContact.activistsLinkLabel}</a>.
          </p>

          <form action={addVolunteer} className="space-y-2 mb-4 border-b border-[var(--border)] pb-4">
            <input name="full_name" placeholder={dict.voterContact.addMemberPlaceholder} className="w-full rounded-lg border border-[var(--border)] px-2.5 py-1.5 text-sm bg-[var(--bg)]" required />
            <input name="phone" placeholder={dict.voterContact.phonePlaceholder} className="w-full rounded-lg border border-[var(--border)] px-2.5 py-1.5 text-sm bg-[var(--bg)]" />
            <button className="w-full rounded-lg bg-[var(--brand-navy)] text-white font-bold px-3.5 py-1.5 text-sm">
              {dict.voterContact.addAsVolunteerButton}
            </button>
          </form>

          <ul className="space-y-2">
            {fieldTeam.length === 0 && <li className="text-xs text-[var(--muted)]">{dict.voterContact.noMembersYet}</li>}
            {fieldTeam.map((m) => (
              <li key={`${m.type}-${m.id}`} className="flex items-center justify-between gap-2 text-sm">
                <div>
                  <div className="font-bold text-[var(--text)]">{m.name}</div>
                  <div className="text-xs text-[var(--muted)]">{m.type === "activist" ? dict.voterContact.activistLabel : dict.voterContact.volunteerLabel}{m.phone ? ` — ${m.phone}` : ""}</div>
                </div>
                <span className="text-xs font-extrabold rounded-full bg-[var(--bg)] border border-[var(--border)] px-2.5 py-1 shrink-0">
                  {m.contactCount.toLocaleString(numberLocale)} {dict.voterContact.registrationsSuffix}
                </span>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </PageShell>
  );
}
