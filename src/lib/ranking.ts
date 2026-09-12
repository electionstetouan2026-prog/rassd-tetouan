import type { createClient } from "@/lib/supabase/server";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

export type Commune = {
  id: string;
  name: string;
  type: string;
  leading_party_2021: string | null;
  leading_party_pct_2021: number | null;
};
type Zone = {
  commune_id: string;
  our_offices_count: number | null;
  our_presence_pct: number | null;
  party_1_name: string | null;
  party_1_offices: number | null;
  party_2_name: string | null;
  party_2_offices: number | null;
  party_3_name: string | null;
  party_3_offices: number | null;
};
type WatchEntry = {
  commune_id: string | null;
  sentiment: string;
  priority: string;
  status: string;
};

function tallyParties(zones: Zone[]) {
  const tally: Record<string, number> = {};
  for (const z of zones) {
    const pairs: [string | null, number | null][] = [
      [z.party_1_name, z.party_1_offices],
      [z.party_2_name, z.party_2_offices],
      [z.party_3_name, z.party_3_offices],
    ];
    for (const [name, offices] of pairs) {
      if (!name) continue;
      tally[name] = (tally[name] ?? 0) + (offices ?? 0);
    }
  }
  return tally;
}

export async function getRankingData(supabase: SupabaseClient) {
  const [{ data: communesRaw }, { data: zonesRaw }, { data: entriesRaw }] = await Promise.all([
    supabase
      .from("communes")
      .select("id, name, type, leading_party_2021, leading_party_pct_2021")
      .order("name"),
    supabase
      .from("commune_zones")
      .select(
        "commune_id, our_offices_count, our_presence_pct, party_1_name, party_1_offices, party_2_name, party_2_offices, party_3_name, party_3_offices"
      ),
    supabase.from("digital_watch_entries").select("commune_id, sentiment, priority, status"),
  ]);

  const communes = (communesRaw ?? []) as Commune[];
  const zones = (zonesRaw ?? []) as Zone[];
  const entries = (entriesRaw ?? []) as WatchEntry[];

  const unassignedEntries = entries.filter((e) => !e.commune_id);

  const communeRows = communes.map((c) => {
    const cZones = zones.filter((z) => z.commune_id === c.id);
    const cEntries = entries.filter((e) => e.commune_id === c.id);

    const ourOfficesTotal = cZones.reduce((sum, z) => sum + (z.our_offices_count ?? 0), 0);
    const presenceValues = cZones.map((z) => z.our_presence_pct).filter((v): v is number => v != null);
    const ourPresenceAvg = presenceValues.length
      ? presenceValues.reduce((a, b) => a + b, 0) / presenceValues.length
      : null;

    const partyTally = tallyParties(cZones);
    const ranking = [
      { name: "نحن (زهير الركاني)", offices: ourOfficesTotal, isUs: true },
      ...Object.entries(partyTally).map(([name, offices]) => ({ name, offices, isUs: false })),
    ].sort((a, b) => b.offices - a.offices);

    const sentimentCounts: Record<string, number> = { "إيجابي": 0, "محايد": 0, "سلبي": 0 };
    for (const e of cEntries) sentimentCounts[e.sentiment] = (sentimentCounts[e.sentiment] ?? 0) + 1;
    const urgentOpen = cEntries.filter(
      (e) => e.priority === "عاجل" && e.status !== "تمت المعالجة" && e.status !== "مؤرشف"
    ).length;

    const hasFieldData = cZones.length > 0;
    const needsAttention = urgentOpen > 0 || sentimentCounts["سلبي"] > sentimentCounts["إيجابي"];

    return {
      commune: c,
      hasFieldData,
      ranking,
      ourPresenceAvg,
      zonesCount: cZones.length,
      sentimentCounts,
      urgentOpen,
      digitalTotal: cEntries.length,
      needsAttention,
    };
  });

  const totalUrgentOpen = communeRows.reduce((sum, r) => sum + r.urgentOpen, 0);
  const communesWithFieldData = communeRows.filter((r) => r.hasFieldData).length;

  return { communes, communeRows, totalUrgentOpen, communesWithFieldData, unassignedEntries };
}
