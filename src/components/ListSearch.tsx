"use client";

import { useEffect, useState } from "react";
import { IconSearch } from "@/components/icons";
import type { Dictionary } from "@/lib/i18n/getDictionary";

/**
 * أداة بحث فورية (client-side، بلا أي طلب جديد للسيرفر) — كتفلتر
 * العناصر المعروضة أصلا فالصفحة (اللي جاية من السيرفر) حسب نص كتبو
 * المستخدم، بمطابقة على كامل النص الظاهر لكل عنصر (data-search-text
 * إذا مُعطى، وإلا textContent العادي ديال العنصر).
 *
 * الاستعمال: `<ListSearch scopeId="observers-list" placeholder="..." />`
 * فوق حاوية عندها `id={scopeId}`، وكل عنصر قابل للفلترة داخلها عندو
 * `data-search-item` (وعنصر تجميع اختياري، مثلا جماعة كتجمع عدة
 * مكاتب، عندو `data-search-group` باش يتخبى إذا ما بقاش فيه أي عنصر
 * ظاهر بعد الفلترة).
 */
export default function ListSearch({
  scopeId,
  placeholder = "بحث...",
  className = "",
  dict,
  locale = "ar",
}: {
  scopeId: string;
  placeholder?: string;
  className?: string;
  dict?: Dictionary;
  locale?: string;
}) {
  const [query, setQuery] = useState("");
  const [matchCount, setMatchCount] = useState<number | null>(null);
  const dir = locale === "fr" ? "ltr" : "rtl";
  const clearSearchLabel = dict?.common.clearSearchAriaLabel ?? "مسح البحث";
  const noMatchingResultsText = dict?.common.noMatchingResults ?? "ماكاينش أي نتيجة مطابقة";
  const matchingResultsSuffixText = dict?.common.matchingResultsSuffix ?? "نتيجة مطابقة";

  useEffect(() => {
    const scope = document.getElementById(scopeId);
    if (!scope) return;

    const q = query.trim().toLocaleLowerCase(locale);
    const items = Array.from(scope.querySelectorAll<HTMLElement>("[data-search-item]"));
    const groups = Array.from(scope.querySelectorAll<HTMLElement>("[data-search-group]"));

    if (q === "") {
      items.forEach((el) => {
        el.hidden = false;
      });
      groups.forEach((el) => {
        el.hidden = false;
      });
      setMatchCount(null);
      return;
    }

    let visibleCount = 0;
    items.forEach((el) => {
      const text = (el.dataset.searchText ?? el.textContent ?? "").toLocaleLowerCase(locale);
      const match = text.includes(q);
      el.hidden = !match;
      if (match) {
        visibleCount++;
        // إذا العنصر نفسه ولا أحد أجداده <details>، نفتحوه باش النتيجة تبان
        let node: HTMLElement | null = el;
        while (node && node !== scope) {
          if (node.tagName === "DETAILS") (node as HTMLDetailsElement).open = true;
          node = node.parentElement;
        }
      }
    });

    // خبّي مجموعة (مثلا جماعة) إذا ماعادش فيها أي عنصر ظاهر
    groups.forEach((group) => {
      const hasVisibleChild = group.querySelector("[data-search-item]:not([hidden])");
      group.hidden = !hasVisibleChild;
    });

    setMatchCount(visibleCount);
  }, [query, scopeId, locale]);

  return (
    <div className={`relative mb-4 ${className}`}>
      <div className="relative">
        <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--muted)] pointer-events-none">
          <IconSearch />
        </span>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          dir={dir}
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--card)] pr-10 pl-9 py-2.5 text-sm focus:border-[var(--brand-blue)] focus:outline-none"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            aria-label={clearSearchLabel}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)] text-xs font-extrabold hover:text-[var(--text)]"
          >
            ×
          </button>
        )}
      </div>
      {query && (
        <div className="text-xs text-[var(--muted)] mt-1.5">
          {matchCount === 0 ? noMatchingResultsText : `${matchCount} ${matchingResultsSuffixText}`}
        </div>
      )}
    </div>
  );
}
