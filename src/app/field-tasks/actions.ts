"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function addFieldTask(formData: FormData) {
  const supabase = await createClient();
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const task_date = String(formData.get("task_date") ?? "").trim() || new Date().toISOString().slice(0, 10);
  const commune_id = String(formData.get("commune_id") ?? "").trim() || null;
  const zone_name = String(formData.get("zone_name") ?? "").trim() || null;
  const team = String(formData.get("team") ?? "").trim() || null;
  if (!title) return;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  await supabase.from("field_tasks").insert({
    title,
    description,
    task_date,
    commune_id,
    zone_name,
    team,
    created_by: user?.id ?? null,
  });
  revalidatePath("/field-tasks");
}

export async function updateFieldTaskStatus(id: string, status: string) {
  "use server";
  const supabase = await createClient();
  await supabase
    .from("field_tasks")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id);
  revalidatePath("/field-tasks");
}
