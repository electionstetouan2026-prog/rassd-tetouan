"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function setVoterContactStatus(formData: FormData) {
  const supabase = await createClient();
  const voterId = Number(formData.get("voter_id"));
  const communeId = String(formData.get("commune_id") ?? "").trim() || null;
  const pollingStationId = String(formData.get("polling_station_id") ?? "").trim() || null;
  const status = String(formData.get("status") ?? "contacted").trim();
  const channel = String(formData.get("channel") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;
  if (!voterId) return;

  await supabase.from("voter_contact_status").upsert(
    {
      voter_id: voterId,
      commune_id: communeId,
      polling_station_id: pollingStationId,
      status,
      channel,
      notes,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "voter_id" }
  );

  const redirectTo = String(formData.get("redirect_to") ?? "").trim();
  revalidatePath(redirectTo || "/voter-contact");
}

export async function clearVoterContactStatus(voterId: number, redirectTo: string) {
  "use server";
  const supabase = await createClient();
  await supabase.from("voter_contact_status").delete().eq("voter_id", voterId);
  revalidatePath(redirectTo || "/voter-contact");
}
