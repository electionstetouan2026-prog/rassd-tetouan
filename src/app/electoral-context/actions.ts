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

  const { error } = await supabase.from("party_officials").insert({
    full_name,
    role,
    commune_id,
    category,
    notes,
  });
  if (error) {
    // تسجيل الخطأ فسجلات السيرفر بدل الفشل الصامت (درس من TASK_REGISTER.md ملاحظة اثنان وثلاثون)
    console.error("addPartyOfficial insert error:", JSON.stringify(error));
  }
  revalidatePath("/electoral-context");
}

export async function deletePartyOfficial(id: string) {
  "use server";
  const supabase = await createClient();
  const { error } = await supabase.from("party_officials").delete().eq("id", id);
  if (error) {
    console.error("deletePartyOfficial delete error:", JSON.stringify(error));
  }
  revalidatePath("/electoral-context");
}
