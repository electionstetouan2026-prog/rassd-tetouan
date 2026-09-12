"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getRankingData } from "@/lib/ranking";
import { generateWithGemini } from "@/lib/ai/gemini";

function buildPrompt(data: Awaited<ReturnType<typeof getRankingData>>) {
  const lines: string[] = [];
  lines.push("بيانات الحملة الانتخابية (رقمية بحتة، بلا أي أسماء أشخاص أو ناخبين):");
  for (const r of data.communeRows) {
    const rankStr = r.hasFieldData
      ? r.ranking.map((p, i) => `${i + 1}) ${p.name}: ${p.offices}`).join("، ")
      : "بلا بيانات ميدانية بعد";
    lines.push(
      `- ${r.commune.name}: ترتيب مفترض [${rankStr}]. يقظة رقمية: إيجابي=${r.sentimentCounts["إيجابي"]}, محايد=${r.sentimentCounts["محايد"]}, سلبي=${r.sentimentCounts["سلبي"]}, عاجل بدون معالجة=${r.urgentOpen}. خط أساس 2021: ${r.commune.leading_party_2021 ?? "غير متوفر"}${r.commune.leading_party_pct_2021 ? ` (${r.commune.leading_party_pct_2021}%)` : ""}.`
    );
  }
  lines.push("");
  lines.push(
    "اكتب ملخصا تحليليا قصيرا (فقرة أو فقرتين، بالدارجة المغربية أو العربية الفصحى البسيطة) لفريق حملة زهير الركاني، يوضح: أين وضعنا مريح، أين محتاجين انتباه فوري (خصوصا الجماعات فيها إشارات عاجلة أو سلبية طاغية)، وأي ملاحظة مفيدة من مقارنة الأرقام. اعتمد فقط على الأرقام المعطاة أعلاه بلا اختراع أي معلومة إضافية. لا تذكر أي اسم شخص. اكتب النص مباشرة بلا مقدمة."
  );
  return lines.join("\n");
}

export async function generateRankingSummary() {
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);

  const data = await getRankingData(supabase);
  const prompt = buildPrompt(data);
  const result = await generateWithGemini(prompt);

  if (!result) {
    // فشل هادئ — الصفحة كتبقى تخدم بلا ملخص AI، الجداول الرقمية دايما متوفرة
    revalidatePath("/ranking");
    return;
  }

  await supabase.from("ranking_ai_summaries").upsert(
    { summary_date: today, summary_text: result.text, model: result.model },
    { onConflict: "summary_date" }
  );
  revalidatePath("/ranking");
}
