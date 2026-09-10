"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function addObserver(formData: FormData) {
  const supabase = await createClient();
  const full_name = String(formData.get("full_name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim() || null;
  const polling_station_id = String(formData.get("polling_station_id") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;
  if (!full_name) return;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  await supabase.from("observers").insert({
    full_name,
    phone,
    polling_station_id,
    notes,
    assigned_by: user?.id ?? null,
    confirmation_status: polling_station_id ? "غير مؤكد" : "لم يُعيّن",
  });
  revalidatePath("/observers");
}

export async function updateObserverStatus(id: string, status: string) {
  "use server";
  const supabase = await createClient();
  await supabase
    .from("observers")
    .update({ confirmation_status: status, last_checked_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", id);
  revalidatePath("/observers");
}

export async function assignStation(id: string, formData: FormData) {
  const supabase = await createClient();
  const polling_station_id = String(formData.get("polling_station_id") ?? "").trim() || null;
  await supabase
    .from("observers")
    .update({
      polling_station_id,
      confirmation_status: polling_station_id ? "غير مؤكد" : "لم يُعيّن",
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  revalidatePath("/observers");
}
