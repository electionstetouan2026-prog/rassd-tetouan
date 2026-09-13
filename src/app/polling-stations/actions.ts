"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function updatePollingStationLocation(id: string, formData: FormData) {
  const supabase = await createClient();
  const approx_zone = String(formData.get("approx_zone") ?? "").trim() || null;
  const coordinates = String(formData.get("coordinates") ?? "").trim() || null;
  const map_link = String(formData.get("map_link") ?? "").trim() || null;
  const location_confirmed = String(formData.get("location_confirmed") ?? "غير محدد").trim();

  await supabase
    .from("polling_stations")
    .update({ approx_zone, coordinates, map_link, location_confirmed })
    .eq("id", id);
  revalidatePath("/polling-stations");
}
