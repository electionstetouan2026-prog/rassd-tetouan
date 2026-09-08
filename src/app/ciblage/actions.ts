"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function addKeyword(formData: FormData) {
  const supabase = await createClient();
  const term = String(formData.get("term") ?? "").trim();
  const category = String(formData.get("category") ?? "general");
  if (!term) return;
  await supabase.from("keywords").insert({ term, category });
  revalidatePath("/ciblage");
}

export async function toggleKeyword(id: string, isActive: boolean) {
  "use server";
  const supabase = await createClient();
  await supabase.from("keywords").update({ is_active: isActive }).eq("id", id);
  revalidatePath("/ciblage");
}

export async function addSource(formData: FormData) {
  const supabase = await createClient();
  const name = String(formData.get("name") ?? "").trim();
  const url = String(formData.get("url") ?? "").trim();
  if (!name || !url) return;
  await supabase.from("sources").insert({ name, url, type: "rss" });
  revalidatePath("/ciblage");
}

export async function toggleSource(id: string, isActive: boolean) {
  "use server";
  const supabase = await createClient();
  await supabase.from("sources").update({ is_active: isActive }).eq("id", id);
  revalidatePath("/ciblage");
}

export async function addTargetAccount(formData: FormData) {
  const supabase = await createClient();
  const url = String(formData.get("url") ?? "").trim();
  const platform = String(formData.get("platform") ?? "");
  const label = String(formData.get("label") ?? "").trim() || null;
  const category = String(formData.get("category") ?? "other");
  const note = String(formData.get("note") ?? "").trim() || null;
  if (!url || !platform) return;
  await supabase.from("target_accounts").insert({ url, platform, label, category, note });
  revalidatePath("/ciblage");
}

export async function toggleTargetAccount(id: string, isActive: boolean) {
  "use server";
  const supabase = await createClient();
  await supabase.from("target_accounts").update({ is_active: isActive }).eq("id", id);
  revalidatePath("/ciblage");
}
