import PageShell from "@/components/PageShell";
import { createClient } from "@/lib/supabase/server";
import { IconIdBadge } from "@/components/icons";
import { updateCandidateProfile } from "./actions";
import { getDictionary } from "@/lib/i18n/getDictionary";

export const dynamic = "force-dynamic";

type CandidateRow = {
  id: string;
  name: string;
  is_our_candidate: boolean;
  party: string | null;
  current_position: string | null;
  electoral_history: string | null;
  baseline_strength: number;
  notes: string | null;
};

export default async function CandidatesPage() {
  const { dict } = await getDictionary();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("candidates")
    .select("id, name, is_our_candidate, party, current_position, electoral_history, baseline_strength, notes")
    .order("baseline_strength", { ascending: false });

  if (error) {
    console.error("candidates page select error:", JSON.stringify(error));
  }

  const rows = (data ?? []) as CandidateRow[];

  return (
    <PageShell
      title={dict.candidates.title}
      subtitle={dict.candidates.subtitle}
      icon={<IconIdBadge />}
    >
      <div className="rounded-xl px-5 py-4 mb-6 text-xs leading-relaxed text-[var(--muted)] bg-[var(--card)] border border-[var(--border)]">
        <strong className="text-[var(--text)]">{dict.candidates.noteBoxTitle}</strong>: {dict.candidates.noteBoxBody}
      </div>

      <div className="space-y-3">
        {rows.map((c) => (
          <form
            key={c.id}
            action={updateCandidateProfile.bind(null, c.id)}
            className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm"
          >
            <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
              <div className="font-extrabold text-[var(--heading)] text-[15px]">
                {c.name}
                {c.is_our_candidate && (
                  <span className="mr-2 text-xs font-bold rounded-full px-2.5 py-1 bg-[var(--brand-blue)] text-white">
                    {dict.candidates.ourCandidateBadge}
                  </span>
                )}
              </div>
              <button className="text-xs font-bold rounded-full px-4 py-1.5 bg-[var(--brand-blue)] text-white hover:bg-[var(--brand-blue-hover)] transition">
                {dict.candidates.saveButton}
              </button>
            </div>
            <div className="grid gap-2.5 sm:grid-cols-2">
              <input
                name="party"
                defaultValue={c.party ?? ""}
                placeholder={dict.candidates.partyPlaceholder}
                className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm bg-[var(--bg)] focus:border-[var(--brand-blue)] focus:outline-none"
              />
              <input
                name="current_position"
                defaultValue={c.current_position ?? ""}
                placeholder={dict.candidates.positionPlaceholder}
                className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm bg-[var(--bg)] focus:border-[var(--brand-blue)] focus:outline-none"
              />
              <input
                name="electoral_history"
                defaultValue={c.electoral_history ?? ""}
                placeholder={dict.candidates.historyPlaceholder}
                className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm bg-[var(--bg)] focus:border-[var(--brand-blue)] focus:outline-none"
              />
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-[var(--muted)] shrink-0">{dict.candidates.weightLabel}</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  name="baseline_strength"
                  defaultValue={c.baseline_strength}
                  className="w-24 rounded-lg border border-[var(--border)] px-3 py-2 text-sm bg-[var(--bg)] focus:border-[var(--brand-blue)] focus:outline-none"
                />
              </div>
              <input
                name="notes"
                defaultValue={c.notes ?? ""}
                placeholder={dict.candidates.notesPlaceholder}
                className="sm:col-span-2 rounded-lg border border-[var(--border)] px-3 py-2 text-sm bg-[var(--bg)] focus:border-[var(--brand-blue)] focus:outline-none"
              />
            </div>
          </form>
        ))}
        {error && (
          <div className="rounded-xl border border-red-300 bg-red-50 p-4 text-xs text-red-800" dir="ltr">
            <strong>Supabase error:</strong> {error.message}
            {error.code && <> (code: {error.code})</>}
            {error.hint && <div>hint: {error.hint}</div>}
            {error.details && <div>details: {error.details}</div>}
          </div>
        )}
        {!error && rows.length === 0 && (
          <p className="text-sm text-[var(--muted)]">
            {dict.candidates.emptyTableMessage}
          </p>
        )}
      </div>
    </PageShell>
  );
}
