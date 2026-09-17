"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { runPolibrandImport, type PolibrandPlatform, type PolibrandImportResult } from "@/lib/polibrandImport";

export type PolibrandImportState = {
  ok: boolean;
  message: string;
  results?: PolibrandImportResult[];
};

const FILE_FIELDS: { field: string; platform: PolibrandPlatform }[] = [
  { field: "presse_file", platform: "صحافة" },
  { field: "facebook_file", platform: "فيسبوك" },
  { field: "instagram_file", platform: "انستغرام" },
];

export async function runPolibrandImportAction(
  _prevState: PolibrandImportState | null,
  formData: FormData
): Promise<PolibrandImportState> {
  const supabase = await createClient();
  const results: PolibrandImportResult[] = [];

  for (const { field, platform } of FILE_FIELDS) {
    const file = formData.get(field) as File | null;
    if (!file || file.size === 0) continue;
    const buffer = await file.arrayBuffer();
    const result = await runPolibrandImport(supabase, platform, buffer, file.name);
    results.push(result);
  }

  if (results.length === 0) {
    return { ok: false, message: "اختر على الأقل ملف واحد (صحافة، فيسبوك، أو انستغرام) قبل الاستيراد." };
  }

  const anyOk = results.some((r) => r.ok);
  if (anyOk) {
    revalidatePath("/digital-watch");
    revalidatePath("/ranking");
  }

  return {
    ok: anyOk,
    message: anyOk ? "تم معالجة الملفات المرفوعة." : "تعذّر استيراد أي ملف.",
    results,
  };
}
