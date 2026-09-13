"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function addActivist(formData: FormData) {
  const supabase = await createClient();
  const full_name = String(formData.get("full_name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim() || null;
  const email = String(formData.get("email") ?? "").trim() || null;
  const membership_number = String(formData.get("membership_number") ?? "").trim() || null;
  const commune_id = String(formData.get("commune_id") ?? "").trim() || null;
  const local_branch = String(formData.get("local_branch") ?? "").trim() || null;
  const responsibility = String(formData.get("responsibility") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;
  if (!full_name) return;

  await supabase.from("activists").insert({
    full_name,
    phone,
    email,
    membership_number,
    commune_id,
    local_branch,
    responsibility,
    notes,
  });
  revalidatePath("/activists");
}

export async function updateActivistStatus(id: string, status: string) {
  "use server";
  const supabase = await createClient();
  await supabase.from("activists").update({ status }).eq("id", id);
  revalidatePath("/activists");
}

export async function deleteActivist(id: string) {
  "use server";
  const supabase = await createClient();
  await supabase.from("activists").delete().eq("id", id);
  revalidatePath("/activists");
}
