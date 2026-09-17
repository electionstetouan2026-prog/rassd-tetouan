"use client";

import { useActionState } from "react";
import { runPolibrandImportAction, type PolibrandImportState } from "./actions";

const SLOTS = [
  { field: "presse_file", label: "ملف الصحافة (Presse)" },
  { field: "facebook_file", label: "ملف فيسبوك (Facebook)" },
  { field: "instagram_file", label: "ملف انستغرام (Instagram)" },
];

export default function PolibrandImportForm() {
  const [state, formAction, isPending] = useActionState<PolibrandImportState | null, FormData>(
    runPolibrandImportAction,
    null
  );

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm">
      <form action={formAction} className="grid gap-4">
        {SLOTS.map((slot) => (
          <div key={slot.field}>
            <label className="text-sm font-bold text-[var(--muted)] block mb-1.5">{slot.label}</label>
            <input
              type="file"
              name={slot.field}
              accept=".xlsx,.xls"
              className="w-full rounded-lg border border-[var(--border)] px-3.5 py-2.5 text-[15px] bg-[var(--bg)] file:ml-3 file:rounded-md file:border-0 file:bg-[var(--brand-blue)] file:text-white file:px-3 file:py-1.5 file:font-bold"
            />
          </div>
        ))}

        <button
          type="submit"
          disabled={isPending}
          className="mt-2 rounded-lg bg-[var(--brand-blue)] text-white font-bold px-4 py-2.5 hover:bg-[var(--brand-blue-hover)] transition disabled:opacity-60"
        >
          {isPending ? "جارٍ الاستيراد…" : "استيراد الملفات المختارة"}
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
          {!!state.results?.length && (
            <ul className="mt-3 space-y-1.5 list-disc pr-5">
              {state.results.map((r, i) => (
                <li key={i}>{r.message}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
