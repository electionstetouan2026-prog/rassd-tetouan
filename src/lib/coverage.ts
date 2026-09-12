import type { createClient } from "@/lib/supabase/server";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

type ZoneRow = { id: string; commune_id: string };
type CellRow = { id: string; zone_id: string };
type StationRow = { id: string; commune_id: string; is_mock: boolean };
type ObserverRow = { polling_station_id: string | null; confirmation_status: string };

export type CommuneCoverage = {
  totalZones: number;
  zonesWithCells: number;
  fieldCoveragePct: number | null; // null = لا توجد مناطق مُدخلة بعد لهاد الجماعة
  totalStations: number;
  coveredStations: number;
  electionDayCoveragePct: number | null; // null = لا توجد مكاتب حقيقية مسجلة بعد
};

/**
 * محرك نسبة التغطية ذات المستويين (طلب علي، 12 شتنبر 2026):
 *
 * 1) "التغطية الميدانية" — مبنية على "الخلايا" (zone_cells): كل خلية = وحدة
 *    تنظيمية قائمة فعليا فحي/دوار معين. النسبة = (عدد المناطق فيها خلية
 *    واحدة على الأقل) ÷ (عدد المناطق الكلي المُدخلة). تتحدث آليا مع كل خلية
 *    جديدة تُضاف — بلا إدخال يدوي لرقم النسبة.
 *
 * 2) "تغطية يوم الاقتراع" — مبنية على المراقبين المؤكدين (observers) مقابل
 *    مكاتب التصويت الحقيقية (بلا is_mock). نفس منطق مؤشر لوحة القيادة
 *    الرئيسية، لكن هنا مع تفصيل على مستوى كل جماعة.
 */
export async function getCoverageData(supabase: SupabaseClient) {
  const [{ data: zonesRaw }, { data: cellsRaw }, { data: stationsRaw }, { data: observersRaw }] =
    await Promise.all([
      supabase.from("commune_zones").select("id, commune_id"),
      supabase.from("zone_cells").select("id, zone_id"),
      supabase.from("polling_stations").select("id, commune_id, is_mock"),
      supabase.from("observers").select("polling_station_id, confirmation_status"),
    ]);

  const zones = (zonesRaw ?? []) as ZoneRow[];
  const cells = (cellsRaw ?? []) as CellRow[];
  const stations = ((stationsRaw ?? []) as StationRow[]).filter((s) => !s.is_mock);
  const observers = (observersRaw ?? []) as ObserverRow[];

  const zoneIdsWithCells = new Set(cells.map((c) => c.zone_id));
  const confirmedStationIds = new Set(
    observers
      .filter((o) => o.confirmation_status === "مؤكد" && o.polling_station_id)
      .map((o) => o.polling_station_id)
  );

  function computeFor(communeId: string | null): CommuneCoverage {
    const cZones = communeId ? zones.filter((z) => z.commune_id === communeId) : zones;
    const cStations = communeId ? stations.filter((s) => s.commune_id === communeId) : stations;
    const zonesWithCells = cZones.filter((z) => zoneIdsWithCells.has(z.id)).length;
    const coveredStations = cStations.filter((s) => confirmedStationIds.has(s.id)).length;

    return {
      totalZones: cZones.length,
      zonesWithCells,
      fieldCoveragePct: cZones.length ? (zonesWithCells / cZones.length) * 100 : null,
      totalStations: cStations.length,
      coveredStations,
      electionDayCoveragePct: cStations.length ? (coveredStations / cStations.length) * 100 : null,
    };
  }

  const overall = computeFor(null);

  const communeIds = Array.from(
    new Set([...zones.map((z) => z.commune_id), ...stations.map((s) => s.commune_id)])
  );
  const byCommune = new Map<string, CommuneCoverage>();
  for (const cid of communeIds) byCommune.set(cid, computeFor(cid));

  return { overall, byCommune, zoneIdsWithCells };
}
