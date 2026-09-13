"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function addVolunteer(formData: FormData) {
  const supabase = await createClient();
  const full_name = String(formData.get("full_name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim() || null;
  const email = String(formData.get("email") ?? "").trim() || null;
  const commune_id = String(formData.get("commune_id") ?? "").trim() || null;
  const skills = String(formData.get("skills") ?? "").trim() || null;
  const availability = String(formData.get("availability") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;
  if (!full_name) return;

  await supabase.from("volunteers").insert({
    full_name,
    phone,
    email,
    commune_id,
    skills,
    availability,
    notes,
  });
  revalidatePath("/volunteers");
}

export async function updateVolunteerStatus(id: string, status: string) {
  "use server";
  const supabase = await createClient();
  await supabase.from("volunteers").update({ status }).eq("id", id);
  revalidatePath("/volunteers");
}

export async function deleteVolunteer(id: string) {
  "use server";
  const supabase = await createClient();
  await supabase.from("volunteers").delete().eq("id", id);
  revalidatePath("/volunteers");
}
