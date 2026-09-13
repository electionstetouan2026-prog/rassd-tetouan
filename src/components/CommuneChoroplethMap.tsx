"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
import { COMMUNE_NAME_TO_OSM_RELATION_ID } from "@/lib/communeGeoMapping";

export type CommuneMapDatum = {
  id: string;
  name: string;
  score: number | null;
  hint?: string;
};

function scoreColor(score: number | null): string {
  if (score == null) return "#c7ccd4"; // رمادي — بلا بيانات كافية بعد
  if (score >= 60) return "#16a34a"; // أخضر
  if (score >= 35) return "#f59e0b"; // برتقالي
  return "#dc2626"; // أحمر
}

export default function CommuneChoroplethMap({ data }: { data: CommuneMapDatum[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      if (!containerRef.current || mapRef.current) return;
      const L = (await import("leaflet")).default;

      const [provinceRes, communesRes] = await Promise.all([
        fetch("/data/boundaries/tetouan_admin2.geojson").then((r) => r.json()),
        fetch("/data/boundaries/tetouan_admin8_osm.geojson").then((r) => r.json()),
      ]);

      if (cancelled || !containerRef.current) return;

      const map = L.map(containerRef.current, {
        zoomControl: true,
        attributionControl: true,
        // بلا طبقة أساس (tiles) خارجية — نفس منطق التطبيق المرجعي: طبقة محلية
        // تعمل بلا اتصال إنترنت، بلا بيانات مدن أخرى وقت التشغيل.
      });
      mapRef.current = map;

      const byRelationId = new Map(data.map((d) => [COMMUNE_NAME_TO_OSM_RELATION_ID[d.name], d]));

      L.geoJSON(provinceRes, {
        style: { color: "#1e3a5f", weight: 2, fillOpacity: 0, dashArray: "4 3" },
      }).addTo(map);

      const communesLayer = L.geoJSON(communesRes, {
        style: (feature) => {
          const relId = feature?.properties?.osmRelationId as number | undefined;
          const datum = relId != null ? byRelationId.get(relId) : undefined;
          return {
            color: "#ffffff",
            weight: 1.2,
            fillColor: scoreColor(datum?.score ?? null),
            fillOpacity: 0.75,
          };
        },
        onEachFeature: (feature, layer) => {
          const relId = feature?.properties?.osmRelationId as number | undefined;
          const datum = relId != null ? byRelationId.get(relId) : undefined;
          const name = datum?.name ?? feature?.properties?.nameAr ?? "—";
          const scoreText = datum?.score != null ? `${Math.round(datum.score)}/100` : "بلا مؤشر بعد";
          layer.bindPopup(
            `<div style="font-family:inherit;text-align:right;direction:rtl">
              <strong>${name}</strong><br/>
              <span>${scoreText}</span>
              ${datum?.hint ? `<br/><span style="font-size:11px;color:#666">${datum.hint}</span>` : ""}
            </div>`
          );
          layer.on("mouseover", () => (layer as import("leaflet").Path).setStyle({ weight: 2.5, fillOpacity: 0.9 }));
          layer.on("mouseout", () => communesLayer.resetStyle(layer as import("leaflet").Path));
        },
      }).addTo(map);

      const bounds = communesLayer.getBounds();
      if (bounds.isValid()) map.fitBounds(bounds, { padding: [12, 12] });
    }

    init();

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="relative">
      <div ref={containerRef} style={{ height: 460, width: "100%", background: "#eef1f5" }} className="rounded-lg" />
      <div className="absolute bottom-2 left-2 z-[1000] rounded-lg bg-white/95 border border-[var(--border)] px-3 py-2 text-xs shadow-sm">
        <div className="font-bold mb-1 text-[var(--heading)]">المؤشر</div>
        <div className="flex items-center gap-1.5 mb-0.5"><span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: "#16a34a" }} /> قوي (60+)</div>
        <div className="flex items-center gap-1.5 mb-0.5"><span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: "#f59e0b" }} /> متوسط (35-59)</div>
        <div className="flex items-center gap-1.5 mb-0.5"><span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: "#dc2626" }} /> ضعيف (&lt;35)</div>
        <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: "#c7ccd4" }} /> بلا بيانات بعد</div>
      </div>
    </div>
  );
}
