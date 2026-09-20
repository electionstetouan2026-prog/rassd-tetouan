"use client";

import { useActionState } from "react";
import { runImport } from "./actions";
import type { ImportTargetKey } from "@/lib/importEngine";
import type { Dictionary } from "@/lib/i18n/getDictionary";

export default function ImportForm({ dict }: { dict: Dictionary }) {
  const [state, formAction, isPending] = useActionState(runImport, null);

  const TARGET_OPTIONS: { value: ImportTargetKey; label: string }[] = [
    { value: "volunteers", label: dict.import.targetLabelVolunteers },
    { value: "activists", label: dict.import.targetLabelActivists },
    { value: "party_officials", label: dict.import.targetLabelPartyOfficials },
    { value: "observers", label: dict.import.targetLabelObservers },
  ];

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm">
      <form action={formAction} className="grid gap-3">
        <label className="text-sm font-bold text-[var(--muted)]">{dict.import.targetTypeLabel}</label>
        <select
          name="target"
          required
          defaultValue=""
          className="rounded-lg border border-[var(--border)] px-3.5 py-2.5 text-[15px] bg-[var(--bg)]"
        >
          <option value="" disabled>
            {dict.import.choosePlaceholder}
          </option>
          {TARGET_OPTIONS.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>

        <label className="text-sm font-bold text-[var(--muted)] mt-2">{dict.import.filePlaceholderLabel}</label>
        <input
          type="file"
          name="file"
          required
          accept=".csv,.xlsx,.xls"
          className="rounded-lg border border-[var(--border)] px-3.5 py-2.5 text-[15px] bg-[var(--bg)] file:ml-3 file:rounded-md file:border-0 file:bg-[var(--brand-blue)] file:text-white file:px-3 file:py-1.5 file:font-bold"
        />

        <button
          type="submit"
          disabled={isPending}
          className="mt-2 rounded-lg bg-[var(--brand-blue)] text-white font-bold px-4 py-2.5 hover:bg-[var(--brand-blue-hover)] transition disabled:opacity-60"
        >
          {isPending ? dict.import.importingButton : dict.import.importButton}
        </button>
      </form>

      {state && (
        <div
          className="mt-5 rounded-lg p-4 text-sm leading-relaxed"
          style={{
            background: state.ok ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
            color: state.ok ? "#15803d" : "#b91c1c",
          }}
        >
          <strong>{state.message}</strong>

          {!!state.communeWarnings?.length && (
            <div className="mt-3">
              <div className="font-bold mb-1">{dict.import.communeWarningsLabel} ({state.communeWarnings.length}):</div>
              <ul className="list-disc pr-5 space-y-0.5">
                {state.communeWarnings.slice(0, 20).map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
              {state.communeWarnings.length > 20 && <div className="mt-1">{dict.import.andPrefix}{state.communeWarnings.length - 20} {dict.import.andMoreSuffix}</div>}
            </div>
          )}

          {!!state.duplicates?.length && (
            <div className="mt-3">
              <div className="font-bold mb-1">{dict.import.duplicatesLabel} ({state.duplicates.length}):</div>
              <ul className="list-disc pr-5 space-y-0.5">
                {state.duplicates.slice(0, 20).map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
              {state.duplicates.length > 20 && <div className="mt-1">{dict.import.andPrefix}{state.duplicates.length - 20} {dict.import.andMoreSuffix}</div>}
            </div>
          )}

          {!!state.skipped?.length && (
            <div className="mt-3">
              <div className="font-bold mb-1">{dict.import.skippedRowsLabel} ({state.skipped.length}):</div>
              <ul className="list-disc pr-5 space-y-0.5">
                {state.skipped.slice(0, 20).map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
              {state.skipped.length > 20 && <div className="mt-1">{dict.import.andPrefix}{state.skipped.length - 20} {dict.import.andMoreSuffix}</div>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
