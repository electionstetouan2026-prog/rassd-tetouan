import { extractJson, MODELS, providers } from "./providers";

export interface ResponseSuggestion {
  response_type:
    | "comment"
    | "post"
    | "statement"
    | "video_scenario"
    | "ignore"
    | "multi_step_plan";
  response_draft: string;
  response_model_used: string;
}

const RESPONSE_TYPE_GUIDE = `اختر نوع الرد الأنسب من هاد اللائحة بالضبط:
- comment: تعليق بسيط تحت المنشور
- post: منشور جديد على صفحات الحملة
- statement: بيان رسمي
- video_scenario: سيناريو فيديو رد
- ignore: التجاهل هو الأنسب (رد كيدي زيادة انتشار للهجوم)
- multi_step_plan: خطة رد منظمة متعددة الخطوات (للتهديد الكبير/المنسق)`;

/**
 * اقتراح رد آلي (T-041) — مبدأ غير قابل للتفاوض: النص دائما مسودة،
 * المراجعة والتطبيق يدويان خارج المنصة، بلا نشر تلقائي أو شبه تلقائي أبدا.
 * كيتفعل غير للإشارات المرتبطة بالنطاق (region_relevant) وتهديدها >= 40.
 */
export async function suggestResponse(mention: {
  title: string | null;
  content: string | null;
  threat_score: number | null;
  threat_score_reason: string | null;
}): Promise<ResponseSuggestion | null> {
  if (!mention.threat_score || mention.threat_score < 40) return null;

  const prompt = `أنت مستشار تواصل لحملة زهير الركاني (PPS) بدائرة تطوان.
هاد إشارة تهديدها ${mention.threat_score}/100 (السبب: ${mention.threat_score_reason ?? "—"}).
العنوان: ${mention.title ?? "—"}
المحتوى: ${mention.content ?? "—"}

${RESPONSE_TYPE_GUIDE}

جاوب بـJSON فقط: {"response_type": "...", "response_draft": "النص الكامل الجاهز للنسخ (أو تفسير مختصر إلا كان النوع ignore)"}`;

  try {
    const text = await providers.callClaude(MODELS.stage1.claude, prompt);
    const parsed = extractJson<{ response_type: ResponseSuggestion["response_type"]; response_draft: string }>(
      text
    );
    return { ...parsed, response_model_used: MODELS.stage1.claude };
  } catch {
    try {
      const text = await providers.callGemini(MODELS.stage1.gemini, prompt);
      const parsed = extractJson<{
        response_type: ResponseSuggestion["response_type"];
        response_draft: string;
      }>(text);
      return { ...parsed, response_model_used: `${MODELS.stage1.gemini} (fallback)` };
    } catch {
      return null; // بلا رصيد/فشل الاثنين — نخليو الإشارة بلا اقتراح رد، بصدق
    }
  }
}
