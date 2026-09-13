"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function addPartyOfficial(formData: FormData) {
  const supabase = await createClient();
  const full_name = String(formData.get("full_name") ?? "").trim();
  const role = String(formData.get("role") ?? "").trim() || null;
  const commune_id = String(formData.get("commune_id") ?? "").trim() || null;
  const category = String(formData.get("category") ?? "حالي").trim();
  const notes = String(formData.get("notes") ?? "").trim() || null;
  if (!full_name) return;

  await supabase.from("party_officials").insert({
    full_name,
    role,
    commune_id,
    category,
    notes,
  });
  revalidatePath("/electoral-context");
}

export async function deletePartyOfficial(id: string) {
  "use server";
  const supabase = await createClient();
  await supabase.from("party_officials").delete().eq("id", id);
  revalidatePath("/electoral-context");
}
