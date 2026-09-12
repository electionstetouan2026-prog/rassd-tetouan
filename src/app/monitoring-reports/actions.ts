"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

function strOrNull(v: FormDataEntryValue | null) {
  const s = String(v ?? "").trim();
  return s || null;
}

export async function addMonitoringReport(formData: FormData) {
  const supabase = await createClient();
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  await supabase.from("monitoring_reports").insert({
    title,
    description: strOrNull(formData.get("description")),
    report_type: String(formData.get("report_type") ?? "ملاحظة عامة"),
    severity: String(formData.get("severity") ?? "عادي"),
    polling_station_id: strOrNull(formData.get("polling_station_id")),
    commune_id: strOrNull(formData.get("commune_id")),
    reporter_name: strOrNull(formData.get("reporter_name")),
    created_by: user?.id ?? null,
  });
  revalidatePath("/monitoring-reports");
}

export async function updateReportStatus(id: string, status: string) {
  const supabase = await createClient();
  await supabase
    .from("monitoring_reports")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id);
  revalidatePath("/monitoring-reports");
}

export async function reviewReport(id: string, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  await supabase
    .from("monitoring_reports")
    .update({
      review_notes: strOrNull(formData.get("review_notes")),
      reviewed_by: user?.id ?? null,
      status: "تمت المعالجة",
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  revalidatePath("/monitoring-reports");
}

export async function deleteReport(id: string) {
  const supabase = await createClient();
  await supabase.from("monitoring_reports").delete().eq("id", id);
  revalidatePath("/monitoring-reports");
}
