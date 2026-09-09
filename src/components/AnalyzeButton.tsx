"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AnalyzeButton({ pendingCount }: { pendingCount: number }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleClick() {
    setLoading(true);
    try {
      await fetch("/api/analyze");
    } catch {
      // بلا شبكة/فشل الطلب — نخليو الزر يرجع عادي، الإشارات كتبقى فالانتظار
    } finally {
      setLoading(false);
      router.refresh();
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="text-sm rounded-full px-3 py-1 border border-[var(--border)] flex items-center gap-1.5 disabled:opacity-60"
    >
      <span className={loading ? "animate-spin" : undefined}>↻</span>
      حلل الإشارات ({pendingCount})
    </button>
  );
}
