"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// تحديث ملف مرشح موجود (الوزن البنيوي/الحزب/المنصب/الملاحظات) — ماشي
// إضافة/حذف اسم: الأسماء خاصها تبقى متطابقة بالحرف مع
// src/lib/polibrandEntities.ts، فإضافة اسم جديد كتمر عبر الكود
// (RIVALS) + سطر يدوي فـ supabase/schema.sql، ماشي من هاد الصفحة.
export async function updateCandidateProfile(id: string, formData: FormData) {
  const supabase = await createClient();
  const party = String(formData.get("party") ?? "").trim() || null;
  const current_position = String(formData.get("current_position") ?? "").trim() || null;
  const electoral_history = String(formData.get("electoral_history") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const rawStrength = String(formData.get("baseline_strength") ?? "").trim();
  const baseline_strength = rawStrength === "" ? undefined : Math.max(0, Math.min(100, Number(rawStrength)));

  const { error } = await supabase
    .from("candidates")
    .update({
      party,
      current_position,
      electoral_history,
      notes,
      ...(baseline_strength !== undefined && Number.isFinite(baseline_strength) ? { baseline_strength } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    console.error("updateCandidateProfile update error:", JSON.stringify(error));
  }
  revalidatePath("/candidates");
  revalidatePath("/ranking");
}
