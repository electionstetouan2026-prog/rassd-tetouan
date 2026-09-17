"use client";

import { useActionState } from "react";
import { runNeighborhoodCellsImportAction } from "./neighborhoodCellsActions";

export default function NeighborhoodCellsImportForm({
  communes,
}: {
  communes: { id: string; name: string }[];
}) {
  const [state, formAction, isPending] = useActionState(runNeighborhoodCellsImportAction, null);

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm mb-6">
      <h2 className="font-extrabold text-[var(--heading)] mb-2">استيراد خلايا الأحياء</h2>
      <p className="text-xs text-[var(--muted)] mb-3 leading-relaxed">
        لملف فيه لائحة أحياء/خلايا (اسم الحي أو الخلية + المسؤول عنها + هاتفو، والترتيب وعدد المراقبين المستهدف
        اختياريين). الأعمدة المتوقعة: <b className="text-[var(--text)]">الخلية</b> (إلزامي),{" "}
        <b className="text-[var(--text)]">المسؤول عن الخلية</b>, <b className="text-[var(--text)]">رقم الهاتف</b>,{" "}
        <b className="text-[var(--text)]">الترتيب</b>, <b className="text-[var(--text)]">عدد المراقبين</b>. كل حي
        غير موجود كـ"منطقة" فـ /presence كيتزاد تلقائيا، والبيانات كتتربط مباشرة بالتغطية الميدانية المعروضة فـ
        /presence و/hot-blocks و/stronghold-map.
      </p>
      <form action={formAction} className="grid gap-3">
        <label className="text-sm font-bold text-[var(--muted)]">الجماعة</label>
        <select
          name="commune_id"
          required
          defaultValue=""
          className="rounded-lg border border-[var(--border)] px-3.5 py-2.5 text-[15px] bg-[var(--bg)]"
        >
          <option value="" disabled>
            — اختر —
          </option>
          {communes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        <label className="text-sm font-bold text-[var(--muted)] mt-2">ملف CSV أو Excel (.csv, .xlsx, .xls)</label>
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
          {isPending ? "جارٍ الاستيراد…" : "استيراد الخلايا"}
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

          {!!state.duplicates?.length && (
            <div className="mt-3">
              <div className="font-bold mb-1">مكرر/موجود مسبقا ({state.duplicates.length}):</div>
              <ul className="list-disc pr-5 space-y-0.5">
                {state.duplicates.slice(0, 20).map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
              {state.duplicates.length > 20 && <div className="mt-1">و{state.duplicates.length - 20} أخرى…</div>}
            </div>
          )}

          {!!state.skipped?.length && (
            <div className="mt-3">
              <div className="font-bold mb-1">صفوف تم تجاوزها ({state.skipped.length}):</div>
              <ul className="list-disc pr-5 space-y-0.5">
                {state.skipped.slice(0, 20).map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
              {state.skipped.length > 20 && <div className="mt-1">و{state.skipped.length - 20} أخرى…</div>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
