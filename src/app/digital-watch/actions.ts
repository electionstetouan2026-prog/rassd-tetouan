"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function addDigitalWatchEntry(formData: FormData) {
  const supabase = await createClient();
  const content_summary = String(formData.get("content_summary") ?? "").trim();
  if (!content_summary) return;

  const entry_date = String(formData.get("entry_date") ?? "").trim() || new Date().toISOString().slice(0, 10);
  const platform = String(formData.get("platform") ?? "أخرى").trim() || "أخرى";
  const source_name = String(formData.get("source_name") ?? "").trim() || null;
  const content_url = String(formData.get("content_url") ?? "").trim() || null;
  const attachment_url = String(formData.get("attachment_url") ?? "").trim() || null;
  const sentiment = String(formData.get("sentiment") ?? "محايد").trim() || "محايد";
  const priority = String(formData.get("priority") ?? "عادي").trim() || "عادي";
  const notes = String(formData.get("notes") ?? "").trim() || null;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  await supabase.from("digital_watch_entries").insert({
    entry_date,
    platform,
    source_name,
    content_summary,
    content_url,
    attachment_url,
    sentiment,
    priority,
    notes,
    created_by: user?.id ?? null,
  });
  revalidatePath("/digital-watch");
}
export async function updateDigitalWatchStatus(id: string, status: string) {
  "use server";
  const supabase = await createClient();
  await supabase
    .from("digital_watch_entries")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id);
  revalidatePath("/digital-watch");
}
