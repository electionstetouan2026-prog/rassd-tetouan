type Props = {
  summaryText: string | null;
  model: string | null;
  generatedAt: string | null;
  aiEnabled: boolean;
  onGenerate: () => Promise<void>;
};

export default function AiSummaryBox({ summaryText, model, generatedAt, aiEnabled, onGenerate }: Props) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 mb-6 shadow-sm">
      <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
        <h2 className="text-[15px] font-extrabold text-[var(--heading)]">📝 ملخص تحليلي اليوم (AI)</h2>
        {aiEnabled && (
          <form action={onGenerate}>
            <button className="text-xs font-bold rounded-full px-3.5 py-1.5 border border-[var(--brand-blue)] text-[var(--brand-blue)] hover:bg-[var(--brand-blue)] hover:text-white transition">
              {summaryText ? "🔄 إعادة التوليد" : "✨ توليد ملخص اليوم"}
            </button>
          </form>
        )}
      </div>
      {!aiEnabled ? (
        <p className="text-sm text-[var(--muted)]">مفتاح Gemini API ماشي معطى بعد فإعدادات المنصة.</p>
      ) : summaryText ? (
        <>
          <p className="text-[15px] text-[var(--text)] leading-relaxed whitespace-pre-line">{summaryText}</p>
          <div className="text-xs text-[var(--muted)] mt-2">
            {model ? `مولّد بـ${model}` : ""}
            {generatedAt ? ` · ${new Date(generatedAt).toLocaleString("ar-MA")}` : ""}
          </div>
        </>
      ) : (
        <p className="text-sm text-[var(--muted)]">
          ماكاينش ملخص لليوم بعد — اضغط "توليد ملخص اليوم" باش يتحسب من الأرقام أسفله (مرة وحدة فاليوم).
        </p>
      )}
    </div>
  );
}
