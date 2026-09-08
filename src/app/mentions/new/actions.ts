"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function createManualMention(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const platform = String(formData.get("platform") ?? "");
  const title = String(formData.get("title") ?? "");
  const content = String(formData.get("content") ?? "");
  const url = String(formData.get("url") ?? "") || null;

  if (!platform) {
    throw new Error("اختيار المنصة إلزامي");
  }

  const { error } = await supabase.from("mentions").insert({
    title,
    content,
    url,
    platform,
    entry_method: "manual",
    collector_channel: "manual",
    uploaded_by: user!.id,
    collected_at: new Date().toISOString(),
  });

  if (error) {
    throw new Error(error.message);
  }

  await supabase.from("audit_log").insert({
    actor_id: user!.id,
    action: "mention.manual_upload",
    target_table: "mentions",
    details: { platform, title },
  });

  redirect("/mentions");
}
