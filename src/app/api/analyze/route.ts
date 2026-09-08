import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { analyzeMention } from "@/lib/ai/analyze";
import { suggestResponse } from "@/lib/ai/respond";

export const maxDuration = 60;

const BATCH_SIZE = 5;

/**
 * /api/analyze (GET): كتحلل دفعة (5) من الإشارات الغير محللة بعد،
 * جاهزة للجدولة الخارجية (T-031). كل إشارة مرتبطة بالنطاق وتهديدها >= 40
 * كتاخد اقتراح رد (T-041) تلقائيا فنهاية نفس العملية.
 */
export async function GET() {
  const supabase = createServiceRoleClient();

  const { data: pending, error } = await supabase
    .from("mentions")
    .select("id, title, content")
    .is("analyzed_at", null)
    .limit(BATCH_SIZE);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const results = [];
  for (const mention of pending ?? []) {
    try {
      const analysis = await analyzeMention(mention);

      let responseFields = {};
      if (analysis.region_relevant && analysis.threat_score >= 40) {
        const suggestion = await suggestResponse({
          title: mention.title,
          content: mention.content,
          threat_score: analysis.threat_score,
          threat_score_reason: analysis.threat_score_reason,
        });
        if (suggestion) {
          responseFields = {
            response_type: suggestion.response_type,
            response_draft: suggestion.response_draft,
            response_model_used: suggestion.response_model_used,
            response_generated_at: new Date().toISOString(),
          };
        }
      }

      await supabase
        .from("mentions")
        .update({ ...analysis, analyzed_at: new Date().toISOString(), ...responseFields })
        .eq("id", mention.id);

      results.push({ id: mention.id, ok: true, threat_score: analysis.threat_score });
    } catch (err) {
      results.push({ id: mention.id, ok: false, error: String(err) });
    }
  }

  return NextResponse.json({ ok: true, analyzed: results.length, results });
}
