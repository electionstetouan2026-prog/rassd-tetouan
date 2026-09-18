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

  // نجيبو الصفحات كاملة — Supabase/PostgREST كيحد كل طلب بـ1000 صف
  // بغض النظر عن .order() وحدو، وعدد مكاتب التصويت غادي يكبر مع الوقت
  const pageSize = 1000;
  const data: any[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data: page, error } = await supabase
      .from("polling_stations")
      .select("id, center_name, sub_office_number, is_mock, commune_id, communes(name)")
      .order("center_name")
      .range(from, from + pageSize - 1);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    data.push(...(page ?? []));
    if (!page || page.length < pageSize) break;
  }

  const stations = data.map((s: any) => ({
    id: s.id as string,
    // نفس صيغة العرض المستعملة فصفحة /polling-stations ("مكتب N — الاسم")
    // باش البحث هنا يطابق كيفما كتبها المستخدم هناك بالضبط
    label: `${s.communes?.name ?? "?"} — ${s.sub_office_number ? `مكتب ${s.sub_office_number} — ` : ""}${
      s.center_name
    }${s.is_mock ? " · افتراضي" : ""}`,
  }));

  return NextResponse.json(
    { stations },
    { headers: { "Cache-Control": "private, max-age=30" } }
  );
}
