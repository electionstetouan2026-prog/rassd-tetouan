"use client";

import { useState } from "react";

export default function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // بلا وصول لـclipboard (مثلا http بلا https) — ما نديرو حتى حاجة
    }
  }

  return (
    <button
      onClick={handleCopy}
      className="text-xs rounded-md border border-[var(--border)] px-2 py-1 hover:bg-[var(--surface)] transition"
    >
      {copied ? "✓ تم النسخ" : "نسخ النص"}
    </button>
  );
}
