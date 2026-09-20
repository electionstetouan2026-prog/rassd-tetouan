import PageShell from "@/components/PageShell";
import { IconUpload } from "@/components/icons";
import ImportForm from "./ImportForm";
import NeighborhoodCellsImportForm from "./NeighborhoodCellsImportForm";
import { IMPORT_TARGETS } from "@/lib/importEngine";
import { createClient } from "@/lib/supabase/server";
import { getDictionary } from "@/lib/i18n/getDictionary";

export const dynamic = "force-dynamic";

export default async function ImportPage() {
  const targets = Object.values(IMPORT_TARGETS);
  const supabase = await createClient();
  const { data: communesRaw } = await supabase.from("communes").select("id, name").order("name");
  const communes = communesRaw ?? [];
  const { dict } = await getDictionary();
  const TARGET_LABEL: Record<string, string> = {
    volunteers: dict.import.targetLabelVolunteers,
    activists: dict.import.targetLabelActivists,
    party_officials: dict.import.targetLabelPartyOfficials,
    observers: dict.import.targetLabelObservers,
  };

  return (
    <PageShell
      title={dict.import.title}
      subtitle={dict.import.subtitle}
      icon={<IconUpload />}
    >
      <div
        className="rounded-xl px-5 py-4 mb-6 text-sm leading-relaxed text-white"
        style={{ background: "linear-gradient(120deg, var(--brand-navy) 0%, var(--brand-navy-2) 100%)" }}
      >
        <strong>{dict.import.howToUseTitle}</strong>{dict.import.howToUseBody}
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {targets.map((t) => (
          <section key={t.key} className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm">
            <h2 className="font-extrabold text-[var(--heading)] mb-2">{TARGET_LABEL[t.key] ?? t.label}</h2>
            <p className="text-xs text-[var(--muted)] mb-2">{dict.import.expectedColumnsLabel}</p>
            <ul className="text-sm space-y-1">
              {t.fields.map((f) => (
                <li key={f.key} className="flex items-center gap-1.5">
                  <span className="font-bold text-[var(--text)]">{f.headers[0]}</span>
                  {f.required && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: "var(--severity-high)", color: "white" }}>
                      {dict.import.requiredBadge}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <ImportForm dict={dict} />

      <div className="mt-10 pt-6 border-t border-[var(--border)]">
        <NeighborhoodCellsImportForm communes={communes} dict={dict} />
      </div>
    </PageShell>
  );
}
