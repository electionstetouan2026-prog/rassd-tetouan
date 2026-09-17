"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  runNeighborhoodCellsImport,
  type NeighborhoodCellsImportResult,
} from "@/lib/neighborhoodCellsImport";

export async function runNeighborhoodCellsImportAction(
  _prevState: NeighborhoodCellsImportResult | null,
  formData: FormData
): Promise<NeighborhoodCellsImportResult> {
  const communeId = String(formData.get("commune_id") ?? "");
  const file = formData.get("file") as File | null;

  if (!communeId) {
    return { ok: false, message: "اختر الجماعة أولا." };
  }
  if (!file || file.size === 0) {
    return { ok: false, message: "اختر ملف CSV أو Excel أولا." };
  }

  const buffer = await file.arrayBuffer();
  const supabase = await createClient();
  const result = await runNeighborhoodCellsImport(supabase, communeId, buffer, file.name);

  if (result.ok) {
    revalidatePath("/presence");
    revalidatePath("/hot-blocks");
    revalidatePath("/stronghold-map");
  }
  return result;
}
