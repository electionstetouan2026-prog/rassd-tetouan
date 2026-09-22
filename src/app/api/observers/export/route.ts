import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { createClient } from "@/lib/supabase/server";

/**
 * تصدير لائحة المراقبين كملف Excel، بفلترة اختيارية حسب الحالة والجماعة
 * (نفس فلاتر صفحة /observers). فحالة "الكل" (status=all)، كل صف كيتلوّن
 * حسب حالة التأكيد ديالو باش يسهل التمييز بصريا بلا الحاجة لفتح كل صف.
 *
 * الاستعمال: GET /api/observers/export?status=مؤكد&commune=تطوان
 * status: "all" (افتراضي) أو واحدة من: مؤكد، غير مؤكد، غايب، لم يُعيّن
 * commune: "all" (افتراضي) أو اسم جماعة بالضبط (كيفما كيظهر فجدول communes)
 */

const STATUS_LABEL: Record<string, string> = {
  "مؤكد": "مؤكد",
  "غير مؤكد": "غير مؤكد",
  "غايب": "غايب",
  "لم يُعيّن": "لم يُعيّن",
};

// تلوين فاتح (خلفية) + خط غامق مطابق، بنفس منطق التلوين المعتمد
// فالواجهة (STATUS_COLOR فـ page.tsx) لكن بألوان Excel قياسية (ARGB)
const STATUS_FILL: Record<string, { bg: string; font: string }> = {
  "مؤكد": { bg: "FFC6EFCE", font: "FF006100" },
  "غير مؤكد": { bg: "FFFFEB9C", font: "FF9C6500" },
  "غايب": { bg: "FFFFC7CE", font: "FF9C0006" },
  "لم يُعيّن": { bg: "FFD9D9D9", font: "FF404040" },
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const statusFilter = searchParams.get("status") ?? "all";
  const communeFilter = searchParams.get("commune") ?? "all";

  const supabase = await createClient();

  const { data: observersRaw, error } = await supabase
    .from("observers")
    .select(
      "full_name, phone, confirmation_status, last_checked_at, notes, polling_stations(center_name, sub_office_number, communes(name))"
    )
    .order("full_name", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const observers = (observersRaw ?? []).filter((o: any) => {
    const stationCommune = o.polling_stations?.communes?.name;
    return (
      (statusFilter === "all" || o.confirmation_status === statusFilter) &&
      (communeFilter === "all" || stationCommune === communeFilter)
    );
  });

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("المراقبون", {
    views: [{ rightToLeft: true }],
  });

  sheet.columns = [
    { header: "#", key: "num", width: 6 },
    { header: "الاسم الكامل", key: "name", width: 26 },
    { header: "الهاتف", key: "phone", width: 16 },
    { header: "الجماعة", key: "commune", width: 20 },
    { header: "المكتب", key: "station", width: 40 },
    { header: "الحالة", key: "status", width: 14 },
    { header: "ملاحظات", key: "notes", width: 28 },
    { header: "آخر تحديث", key: "updated", width: 20 },
  ];

  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
  headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF122A55" } };
  headerRow.alignment = { horizontal: "right", vertical: "middle" };

  observers.forEach((o: any, i: number) => {
    const station = o.polling_stations;
    const stationLabel = station
      ? `${station.communes?.name ?? "?"} — ${station.center_name}${
          station.sub_office_number ? ` (فرعي ${station.sub_office_number})` : ""
        }`
      : "بلا مكتب مسند";

    const row = sheet.addRow({
      num: i + 1,
      name: o.full_name,
      phone: o.phone ?? "",
      commune: station?.communes?.name ?? "",
      station: stationLabel,
      status: STATUS_LABEL[o.confirmation_status] ?? o.confirmation_status,
      notes: o.notes ?? "",
      updated: o.last_checked_at ? new Date(o.last_checked_at).toLocaleString("ar-MA") : "",
    });

    row.alignment = { horizontal: "right", vertical: "middle" };

    const colors = STATUS_FILL[o.confirmation_status];
    if (colors) {
      row.eachCell((cell) => {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: colors.bg } };
        cell.font = { color: { argb: colors.font } };
      });
    }
  });

  sheet.autoFilter = { from: "A1", to: "H1" };

  const buffer = await workbook.xlsx.writeBuffer();

  const dateStr = new Date().toISOString().slice(0, 10);
  const statusSlug = statusFilter === "all" ? "الكل" : statusFilter;
  const filename = `مراقبين_${statusSlug}_${dateStr}.xlsx`;

  return new NextResponse(buffer as any, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
      "Cache-Control": "no-store",
    },
  });
}
