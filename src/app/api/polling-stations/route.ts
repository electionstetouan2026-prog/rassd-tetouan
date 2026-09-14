import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * يرجّع لائحة خفيفة (id + label جاهز للعرض) بجميع مكاتب التصويت.
 * الهدف: بدل ما ندرجو 594 <option> فكل select فصفحة المراقبين (كانت كتزيد
 * حجم الصفحة لأكثر من 5 ميغا)، الـ combobox كيجيب هاد اللائحة مرة وحدة
 * فقط ملي المستخدم كيفتح البحث، ويخبيها فالذاكرة (lazy load).
 */
export async function GET() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("polling_stations")
    .select("id, center_name, sub_office_number, is_mock, commune_id, communes(name)")
    .order("center_name");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const stations = (data ?? []).map((s: any) => ({
    id: s.id as string,
    label: `${s.communes?.name ?? "?"} — ${s.center_name}${
      s.sub_office_number ? ` (فرعي ${s.sub_office_number})` : ""
    }${s.is_mock ? " · افتراضي" : ""}`,
  }));

  return NextResponse.json(
    { stations },
    { headers: { "Cache-Control": "private, max-age=30" } }
  );
}
