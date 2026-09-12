"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

function numOrNull(v: FormDataEntryValue | null) {
  const s = String(v ?? "").trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function strOrNull(v: FormDataEntryValue | null) {
  const s = String(v ?? "").trim();
  return s || null;
}

export async function addZone(communeId: string, formData: FormData) {
  const supabase = await createClient();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  await supabase.from("commune_zones").insert({
    commune_id: communeId,
    name,
    zone_type: String(formData.get("zone_type") ?? "حي"),
    our_offices_count: numOrNull(formData.get("our_offices_count")) ?? 0,
    our_presence_pct: numOrNull(formData.get("our_presence_pct")),
    party_1_name: strOrNull(formData.get("party_1_name")),
    party_1_offices: numOrNull(formData.get("party_1_offices")),
    party_2_name: strOrNull(formData.get("party_2_name")),
    party_2_offices: numOrNull(formData.get("party_2_offices")),
    party_3_name: strOrNull(formData.get("party_3_name")),
    party_3_offices: numOrNull(formData.get("party_3_offices")),
    notes: strOrNull(formData.get("notes")),
    updated_by: user?.id ?? null,
  });
  revalidatePath("/presence");
}

export async function updateZone(id: string, formData: FormData) {
  "use server";
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  await supabase
    .from("commune_zones")
    .update({
      our_offices_count: numOrNull(formData.get("our_offices_count")) ?? 0,
      our_presence_pct: numOrNull(formData.get("our_presence_pct")),
      party_1_name: strOrNull(formData.get("party_1_name")),
      party_1_offices: numOrNull(formData.get("party_1_offices")),
      party_2_name: strOrNull(formData.get("party_2_name")),
      party_2_offices: numOrNull(formData.get("party_2_offices")),
      party_3_name: strOrNull(formData.get("party_3_name")),
      party_3_offices: numOrNull(formData.get("party_3_offices")),
      notes: strOrNull(formData.get("notes")),
      updated_by: user?.id ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  revalidatePath("/presence");
}

export async function deleteZone(id: string) {
  "use server";
  const supabase = await createClient();
  await supabase.from("commune_zones").delete().eq("id", id);
  revalidatePath("/presence");
}

// ------------------------------------------------------------
// خلايا الأحياء (Level 1 من نسبة التغطية — راجع src/lib/coverage.ts)
// ------------------------------------------------------------
export async function addCell(zoneId: string, formData: FormData) {
  "use server";
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  await supabase.from("zone_cells").insert({
    zone_id: zoneId,
    cell_name: strOrNull(formData.get("cell_name")),
    contact_name: strOrNull(formData.get("contact_name")),
    contact_phone: strOrNull(formData.get("contact_phone")),
    notes: strOrNull(formData.get("notes")),
    created_by: user?.id ?? null,
  });
  revalidatePath("/presence");
}

export async function deleteCell(id: string) {
  "use server";
  const supabase = await createClient();
  await supabase.from("zone_cells").delete().eq("id", id);
  revalidatePath("/presence");
}
