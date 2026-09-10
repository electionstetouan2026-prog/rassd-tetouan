import PageShell from "@/components/PageShell";
import { createClient } from "@/lib/supabase/server";
import { addZone, deleteZone, updateZone } from "./actions";
import { IconMap } from "@/components/icons";

export const dynamic = "force-dynamic";

const ZONE_TYPES = ["حي", "دوار", "مدشر"];

type Commune = {
  id: string;
  name: string;
  type: string;
  registered_voters_est: number | null;
  participation_rate_2021: number | null;
  seats_total_2021: number | null;
  districts_count_2021: number | null;
  total_votes_2021: number | null;
  leading_party_2021: string | null;
  leading_party_seats_2021: number | null;
  leading_party_pct_2021: number | null;
};

type Zone = {
  id: string;
  commune_id: string;
  name: string;
  zone_type: string;
  our_offices_count: number;
  our_presence_pct: number | null;
  party_1_name: string | null;
  party_1_offices: number | null;
  party_2_name: string | null;
  party_2_offices: number | null;
  party_3_name: string | null;
  party_3_offices: number | null;
  notes: string | null;
  updated_at: string;
};

function pct(n: number | null) {
  if (n === null || n === undefined) return "—";
  return `${Math.round(n * 1000) / 10}%`;
}

export default async function PresencePage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const params = await searchParams;
  const typeFilter = params.type ?? "all";

  const supabase = await createClient();

  const [{ data: communesRaw }, { data: zonesRaw }] = await Promise.all([
    supabase
      .from("communes")
      .select(
        "id, name, type, registered_voters_est, participation_rate_2021, seats_total_2021, districts_count_2021, total_votes_2021, leading_party_2021, leading_party_seats_2021, leading_party_pct_2021"
      )
      .order("name"),
    supabase
      .from("commune_zones")
      .select(
        "id, commune_id, name, zone_type, our_offices_count, our_presence_pct, party_1_name, party_1_offices, party_2_name, party_2_offices, party_3_name, party_3_offices, notes, updated_at"
      )
      .order("name"),
  ]);

  const communes = (communesRaw ?? []) as Commune[];
  const zones = (zonesRaw ?? []) as Zone[];

  const zonesByCommune = new Map<string, Zone[]>();
  for (const z of zones) {
    const list = zonesByCommune.get(z.commune_id) ?? [];
    list.push(z);
    zonesByCommune.set(z.commune_id, list);
  }

  const filteredCommunes = communes.filter((c) => typeFilter === "all" || c.type === typeFilter);

  const totalZones = zones.length;
  const totalOurOffices = zones.reduce((sum, z) => sum + (z.our_offices_count ?? 0), 0);
  const communesWithZones = new Set(zones.map((z) => z.commune_id)).size;

  return (
    <PageShell
      title="خريطة الحضور"
      subtitle="حضورنا الميداني مقابل الأحزاب المنافسة، على مستوى الحي/الدوار/المدشر، مع خط أساس تاريخي حقيقي من انتخابات 2021"
      icon={<IconMap />}
    >
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-6 py-4 shadow-sm">
          <div className="text-2xl font-extrabold text-[var(--heading)]">{totalZones}</div>
          <div className="text-sm font-bold text-[var(--muted)]">مناطق مُدخلة</div>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-6 py-4 shadow-sm">
          <div className="text-2xl font-extrabold text-[var(--heading)]">
            {communesWithZones} من {communes.length}
          </div>
          <div className="text-sm font-bold text-[var(--muted)]">جماعات فيها بيانات حضور</div>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-6 py-4 shadow-sm">
          <div className="text-2xl font-extrabold text-[var(--heading)]">{totalOurOffices}</div>
          <div className="text-sm font-bold text-[var(--muted)]">إجمالي مكاتبنا المصرح بها</div>
        </div>
        <div className="text-sm text-[var(--muted)] max-w-md self-center leading-relaxed">
          لا توجد بيانات رسمية على مستوى الحي/الدوار (elections.ma تتوقف عند الجماعة) —
          القائمة تُبنى يدويا من فريق الحملة الميدانية.
        </div>
      </div>

      <div className="flex gap-2 flex-wrap mb-6">
        {["all", "حضري", "قروي"].map((t) => (
          <a
            key={t}
            href={`/presence?type=${t}`}
            className={`text-sm rounded-full px-4 py-2 border font-bold shadow-sm ${
              typeFilter === t
                ? "bg-[var(--brand-blue)] text-white border-[var(--brand-blue)]"
                : "border-[var(--border)] bg-[var(--card)] text-[var(--text)]"
            }`}
          >
            {t === "all" ? "كل الجماعات" : t} (
            {t === "all" ? communes.length : communes.filter((c) => c.type === t).length})
          </a>
        ))}
      </div>

      <div className="space-y-4">
        {filteredCommunes.map((c) => {
          const communeZones = zonesByCommune.get(c.id) ?? [];
          const communeOffices = communeZones.reduce((s, z) => s + (z.our_offices_count ?? 0), 0);
          return (
            <details key={c.id} className="rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-sm overflow-hidden">
              <summary className="cursor-pointer flex items-center justify-between flex-wrap gap-3 p-5 list-none">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="font-extrabold text-[17px] text-[var(--heading)]">{c.name}</span>
                  <span className="text-xs font-bold rounded-full px-2.5 py-1 border border-[var(--border)] text-[var(--muted)]">
                    {c.type}
                  </span>
                  <span className="text-sm text-[var(--muted)]">
                    {communeZones.length} منطقة · {communeOffices} مكتب لينا
                  </span>
                </div>
                <div className="text-sm text-[var(--muted)] flex gap-4 flex-wrap">
                  <span>مشاركة 2021: <b className="text-[var(--text)]">{pct(c.participation_rate_2021)}</b></span>
                  <span>
                    الحزب الأول 2021: <b className="text-[var(--text)]">{c.leading_party_2021 ?? "—"}</b> ({pct(c.leading_party_pct_2021)}
                    ، {c.leading_party_seats_2021 ?? "—"}/{c.seats_total_2021 ?? "—"} مقعد)
                  </span>
                </div>
              </summary>

              <div className="px-5 pb-5 space-y-3 border-t border-[var(--border)] pt-4">
                {communeZones.map((z) => (
                  <div key={z.id} className="rounded-lg border border-[var(--border)] bg-[var(--bg)] p-4">
                    <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
                      <div className="font-extrabold text-[var(--heading)]">
                        {z.name} <span className="text-sm text-[var(--muted)] font-normal">({z.zone_type})</span>
                      </div>
                      <form action={deleteZone.bind(null, z.id)}>
                        <button
                          className="text-xs font-bold rounded-full px-3 py-1.5"
                          style={{ background: "var(--severity-high)", color: "white" }}
                        >
                          حذف
                        </button>
                      </form>
                    </div>
                    <form action={updateZone.bind(null, z.id)} className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                      <label className="flex flex-col gap-1">
                        <span className="text-sm text-[var(--muted)] font-semibold">مكاتبنا</span>
                        <input
                          type="number"
                          name="our_offices_count"
                          defaultValue={z.our_offices_count ?? 0}
                          className="rounded-lg border border-[var(--border)] px-2.5 py-1.5 bg-[var(--card)]"
                        />
                      </label>
                      <label className="flex flex-col gap-1">
                        <span className="text-sm text-[var(--muted)] font-semibold">نسبة حضورنا %</span>
                        <input
                          type="number"
                          step="0.1"
                          name="our_presence_pct"
                          defaultValue={z.our_presence_pct ?? ""}
                          className="rounded-lg border border-[var(--border)] px-2.5 py-1.5 bg-[var(--card)]"
                        />
                      </label>
                      {[1, 2, 3].map((i) => (
                        <label key={i} className="flex flex-col gap-1 col-span-2 md:col-span-1">
                          <span className="text-sm text-[var(--muted)] font-semibold">
                            الحزب {i} + عدد مكاتبه
                          </span>
                          <div className="flex gap-1">
                            <input
                              name={`party_${i}_name`}
                              defaultValue={(z as any)[`party_${i}_name`] ?? ""}
                              placeholder="اسم الحزب"
                              className="flex-1 rounded-lg border border-[var(--border)] px-2.5 py-1.5 bg-[var(--card)]"
                            />
                            <input
                              type="number"
                              name={`party_${i}_offices`}
                              defaultValue={(z as any)[`party_${i}_offices`] ?? ""}
                              placeholder="#"
                              className="w-14 rounded-lg border border-[var(--border)] px-2.5 py-1.5 bg-[var(--card)]"
                            />
                          </div>
                        </label>
                      ))}
                      <label className="flex flex-col gap-1 col-span-2 md:col-span-4">
                        <span className="text-sm text-[var(--muted)] font-semibold">ملاحظة</span>
                        <input
                          name="notes"
                          defaultValue={z.notes ?? ""}
                          className="rounded-lg border border-[var(--border)] px-2.5 py-1.5 bg-[var(--card)]"
                        />
                      </label>
                      <button className="col-span-2 md:col-span-4 rounded-lg bg-[var(--brand-blue)] text-white font-bold px-3.5 py-2 text-sm hover:bg-[var(--brand-blue-hover)] transition">
                        حفظ التحديث
                      </button>
                    </form>
                  </div>
                ))}
                {communeZones.length === 0 && (
                  <p className="text-[15px] text-[var(--muted)]">
                    ماكاينش مناطق مُدخلة بعد لهاد الجماعة.
                  </p>
                )}

                <details className="rounded-lg border border-[var(--brand-blue)] p-4">
                  <summary className="cursor-pointer text-[15px] font-extrabold text-[var(--brand-blue)]">
                    + إضافة حي/دوار/مدشر
                  </summary>
                  <form action={addZone.bind(null, c.id)} className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm mt-4">
                    <input
                      name="name"
                      required
                      placeholder="اسم المنطقة"
                      className="rounded-lg border border-[var(--border)] px-2.5 py-1.5 bg-[var(--card)]"
                    />
                    <select
                      name="zone_type"
                      defaultValue="حي"
                      className="rounded-lg border border-[var(--border)] px-2.5 py-1.5 bg-[var(--card)]"
                    >
                      {ZONE_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      name="our_offices_count"
                      placeholder="مكاتبنا"
                      defaultValue={0}
                      className="rounded-lg border border-[var(--border)] px-2.5 py-1.5 bg-[var(--card)]"
                    />
                    <input
                      type="number"
                      step="0.1"
                      name="our_presence_pct"
                      placeholder="نسبة حضورنا %"
                      className="rounded-lg border border-[var(--border)] px-2.5 py-1.5 bg-[var(--card)]"
                    />
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex gap-1 col-span-2 md:col-span-1">
                        <input
                          name={`party_${i}_name`}
                          placeholder={`الحزب ${i}`}
                          className="flex-1 rounded-lg border border-[var(--border)] px-2.5 py-1.5 bg-[var(--card)]"
                        />
                        <input
                          type="number"
                          name={`party_${i}_offices`}
                          placeholder="#"
                          className="w-14 rounded-lg border border-[var(--border)] px-2.5 py-1.5 bg-[var(--card)]"
                        />
                      </div>
                    ))}
                    <input
                      name="notes"
                      placeholder="ملاحظة (اختياري)"
                      className="col-span-2 md:col-span-4 rounded-lg border border-[var(--border)] px-2.5 py-1.5 bg-[var(--card)]"
                    />
                    <button className="col-span-2 md:col-span-4 rounded-lg bg-[var(--brand-navy)] text-white font-bold px-3.5 py-2">
                      إضافة
                    </button>
                  </form>
                </details>
              </div>
            </details>
          );
        })}
      </div>
    </PageShell>
  );
}
