import type { Dictionary } from "@/lib/i18n/getDictionary";

type Props = {
  dict: Dictionary;
  dateLocale?: string;
  summaryText: string | null;
  model: string | null;
  generatedAt: string | null;
  aiEnabled: boolean;
  onGenerate: () => Promise<void>;
};

export default function AiSummaryBox({ dict, dateLocale = "ar-MA", summaryText, model, generatedAt, aiEnabled, onGenerate }: Props) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 mb-6 shadow-sm">
      <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
        <h2 className="text-[15px] font-extrabold text-[var(--heading)]">{dict.ranking.aiSummaryTitle}</h2>
        {aiEnabled && (
          <form action={onGenerate}>
            <button className="text-xs font-bold rounded-full px-3.5 py-1.5 border border-[var(--brand-blue)] text-[var(--brand-blue)] hover:bg-[var(--brand-blue)] hover:text-white transition">
              {summaryText ? dict.ranking.aiRegenerateButton : dict.ranking.aiGenerateButton}
            </button>
          </form>
        )}
      </div>
      {!aiEnabled ? (
        <p className="text-sm text-[var(--muted)]">{dict.ranking.aiNotConfiguredMessage}</p>
      ) : summaryText ? (
        <>
          <p className="text-[15px] text-[var(--text)] leading-relaxed whitespace-pre-line">{summaryText}</p>
          <div className="text-xs text-[var(--muted)] mt-2">
            {model ? `${dict.ranking.aiGeneratedByPrefix}${model}` : ""}
            {generatedAt ? ` · ${new Date(generatedAt).toLocaleString(dateLocale)}` : ""}
          </div>
        </>
      ) : (
        <p className="text-sm text-[var(--muted)]">{dict.ranking.aiNoSummaryMessage}</p>
      )}
    </div>
  );
}
