"use client";

import { useEffect, useState } from "react";
import { getPendingAnalysisCount, runMentionAiAnalysisBatch } from "./analyzeActions";
import type { Dictionary } from "@/lib/i18n/getDictionary";

export default function AiAnalysisRunner({ dict }: { dict: Dictionary }) {
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [totalAnalyzed, setTotalAnalyzed] = useState(0);
  const [running, setRunning] = useState(false);
  const [processedThisRun, setProcessedThisRun] = useState(0);

  async function refresh() {
    const r = await getPendingAnalysisCount();
    setConfigured(r.configured);
    setRemaining(r.remaining);
    setTotalAnalyzed(r.totalAnalyzed);
  }

  useEffect(() => {
    refresh();
  }, []);

  async function startAnalysis() {
    setRunning(true);
    setProcessedThisRun(0);
    let done = false;
    while (!done) {
      const result = await runMentionAiAnalysisBatch();
      if (!result.configured) break;
      setProcessedThisRun((n) => n + result.processedThisBatch);
      setRemaining(result.remaining);
      done = result.done;
      if (!done) await new Promise((r) => setTimeout(r, 300)); // مهلة صغيرة بين الدفعات، تفاديا لحد معدل الطلبات
    }
    await refresh();
    setRunning(false);
  }

  if (configured === null) return null;

  if (!configured) {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 mb-6 shadow-sm text-sm text-[var(--muted)]">
        {dict.importPolibrand.aiNotConfiguredMessage}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 mb-6 shadow-sm">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="font-extrabold text-[var(--heading)] mb-1">{dict.importPolibrand.aiAnalysisTitle}</h3>
          <p className="text-sm text-[var(--muted)]">
            {dict.importPolibrand.aiAnalysisDescPrefix} {totalAnalyzed} · {dict.importPolibrand.remainingLabel} {remaining ?? "…"}
          </p>
        </div>
        <button
          onClick={startAnalysis}
          disabled={running || remaining === 0}
          className="rounded-lg bg-[var(--brand-blue)] text-white font-bold px-4 py-2.5 hover:bg-[var(--brand-blue-hover)] transition disabled:opacity-60 shrink-0"
        >
          {running ? `${dict.importPolibrand.analyzingButtonPrefix} (${processedThisRun})` : remaining === 0 ? dict.importPolibrand.allAnalyzedButton : dict.importPolibrand.startContinueAnalysisButton}
        </button>
      </div>
    </div>
  );
}
