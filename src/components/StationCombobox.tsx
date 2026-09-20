"use client";

import { useEffect, useRef, useState } from "react";
import type { Dictionary } from "@/lib/i18n/getDictionary";

type StationOption = { id: string; label: string };

// خبانة (cache) على مستوى الموديول: أول combobox كيفتح البحث كيجيب اللائحة
// من /api/polling-stations، وكل الـ combobox الآخرين فنفس الصفحة كيستافدو
// من نفس اللائحة بلا ما يعاودو الطلب — طلب واحد فقط لكل تحميل صفحة.
let cachedStations: StationOption[] | null = null;
let inflight: Promise<StationOption[]> | null = null;

function loadStations(): Promise<StationOption[]> {
  if (cachedStations) return Promise.resolve(cachedStations);
  if (!inflight) {
    inflight = fetch("/api/polling-stations")
      .then((r) => r.json())
      .then((json) => {
        cachedStations = (json.stations ?? []) as StationOption[];
        return cachedStations;
      })
      .catch(() => {
        inflight = null;
        return [];
      });
  }
  return inflight;
}

export default function StationCombobox({
  name,
  defaultValue,
  defaultLabel,
  placeholder,
  className,
  dict,
}: {
  name: string;
  defaultValue?: string | null;
  defaultLabel?: string | null;
  placeholder?: string;
  className?: string;
  dict?: Dictionary;
}) {
  const resolvedPlaceholder = placeholder ?? dict?.common.stationComboboxPlaceholder ?? "بحث عن مكتب تصويت…";
  const noAssignmentText = dict?.common.stationComboboxNoAssignment ?? "— بلا إسناد —";
  const loadingText = dict?.common.stationComboboxLoading ?? "كنجيب اللائحة…";
  const noResultsText = dict?.common.stationComboboxNoResults ?? "ماكاينش نتائج.";
  const [selectedId, setSelectedId] = useState(defaultValue ?? "");
  const [query, setQuery] = useState(defaultLabel ?? "");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [stations, setStations] = useState<StationOption[] | null>(cachedStations);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function handleFocus() {
    setOpen(true);
    if (!cachedStations) {
      setLoading(true);
      loadStations().then((list) => {
        setStations(list);
        setLoading(false);
      });
    } else if (!stations) {
      setStations(cachedStations);
    }
  }

  // تطبيع بلا حساسية للهمزات/التاء المربوطة، وتقسيم البحث لكلمات — كل
  // كلمة خاصها تكون موجودة فمكان ما فاللابل (بلا شرط الترتيب)، باش
  // "مكتب 2 مدرسة المورد" يلقى نفس النتيجة ديال "مدرسة المورد مكتب 2"
  function normalize(v: string): string {
    return v
      .replace(/[إأآا]/g, "ا")
      .replace(/ى/g, "ي")
      .replace(/ة/g, "ه")
      .toLowerCase();
  }

  const q = query.trim();
  const queryTokens = normalize(q).split(/\s+/).filter(Boolean);
  const results = !stations
    ? []
    : queryTokens.length === 0
    ? stations.slice(0, 50)
    : stations
        .filter((s) => {
          const normalizedLabel = normalize(s.label);
          return queryTokens.every((t) => normalizedLabel.includes(t));
        })
        .slice(0, 50);

  return (
    <div ref={boxRef} className={`relative ${className ?? ""}`}>
      <input type="hidden" name={name} value={selectedId} />
      <input
        type="text"
        value={query}
        placeholder={resolvedPlaceholder}
        onFocus={handleFocus}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          if (selectedId) setSelectedId(""); // كتب = بدا اختيار جديد
        }}
        className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm bg-[var(--bg)] focus:border-[var(--brand-blue)] focus:outline-none"
      />
      {open && (
        <div className="absolute z-20 mt-1 w-full max-h-64 overflow-auto rounded-lg border border-[var(--border)] bg-[var(--card)] shadow-lg">
          <button
            type="button"
            onClick={() => {
              setSelectedId("");
              setQuery("");
              setOpen(false);
            }}
            className="w-full text-right px-3 py-2 text-sm text-[var(--muted)] hover:bg-[var(--bg)] border-b border-[var(--border)]"
          >
            {noAssignmentText}
          </button>
          {loading && <div className="px-3 py-2 text-sm text-[var(--muted)]">{loadingText}</div>}
          {!loading &&
            results.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  setSelectedId(s.id);
                  setQuery(s.label);
                  setOpen(false);
                }}
                className={`w-full text-right px-3 py-2 text-sm hover:bg-[var(--bg)] ${
                  s.id === selectedId ? "font-bold text-[var(--brand-blue)]" : ""
                }`}
              >
                {s.label}
              </button>
            ))}
          {!loading && results.length === 0 && (
            <div className="px-3 py-2 text-sm text-[var(--muted)]">{noResultsText}</div>
          )}
        </div>
      )}
    </div>
  );
}
