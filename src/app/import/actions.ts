"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { runSpreadsheetImport, IMPORT_TARGETS, type ImportTargetKey, type ImportRunResult } from "@/lib/importEngine";

export async function runImport(_prevState: ImportRunResult | null, formData: FormData): Promise<ImportRunResult> {
  const targetKey = String(formData.get("target") ?? "") as ImportTargetKey;
  const file = formData.get("file") as File | null;

  if (!IMPORT_TARGETS[targetKey]) {
    return { ok: false, message: "اختر نوع البيانات المستهدف أولا." };
  }
  if (!file || file.size === 0) {
    return { ok: false, message: "اختر ملف CSV أو Excel أولا." };
  }

  const buffer = await file.arrayBuffer();
  const supabase = await createClient();
  const result = await runSpreadsheetImport(supabase, targetKey, buffer, file.name);

  if (result.ok) {
    revalidatePath(IMPORT_TARGETS[targetKey].redirectPath);
  }
  return result;
}
