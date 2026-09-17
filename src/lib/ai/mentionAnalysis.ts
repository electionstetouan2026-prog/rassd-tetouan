import { ALL_ENTITY_NAMES } from "@/lib/polibrandEntities";

// تحليل مفتوح (Open NER + تقدير تأثير) لإشارات بوليبراند المستوردة —
// بخلاف matched_entities (مطابقة نصية بسيطة بلائحة معروفة سلفا)، هنا
// كنسولو نموذج لغوي يقرا النص فعليا ويقدر يكتشف شخصيات سياسية جداد
// ماكناش نتوقعوها. Anthropic ثم Gemini ثم OpenAI (أول واحد يجاوب،
// نفس منطق "cascading" المجرب سابقا فهاد المشروع). كل موديل قابل
// للتعديل عبر متغير بيئة بلا تعديل كود.

export type MentionForAnalysis = {
  id: string;
  platform: string;
  source_name: string | null;
  author: string | null;
  title: string | null;
  text_excerpt: string | null;
  quoted_excerpt: string | null;
  reactions: number | null;
  comments_count: number | null;
  shares: number | null;
  niveau: string | null;
};

export type MentionAiResult = { id: string; entities: string[]; influence: number };

function truncate(s: string | null | undefined, max: number): string {
  const v = (s ?? "").trim();
  return v.length > max ? v.slice(0, max) + "…" : v;
}

function buildPrompt(mentions: MentionForAnalysis[]): string {
  const knownList = ALL_ENTITY_NAMES.join("، ");
  const items = mentions
    .map((m) => {
      const engagement =
        m.reactions != null || m.comments_count != null || m.shares != null
          ? `تفاعل: إعجابات=${m.reactions ?? 0}, تعليقات=${m.comments_count ?? 0}, مشاركات=${m.shares ?? 0}`
          : "بلا بيانات تفاعل (صحافة)";
      return [
        `id: ${m.id}`,
        `المنصة: ${m.platform}${m.source_name ? ` — المصدر: ${m.source_name}` : ""}${m.author ? ` — الكاتب: ${m.author}` : ""}`,
        m.title ? `العنوان: ${truncate(m.title, 200)}` : null,
        `النص: ${truncate(m.text_excerpt || m.quoted_excerpt, 500)}`,
        engagement,
        m.niveau ? `(شدة تهديد مرصودة من نظام آخر: ${m.niveau} — لا تعتمد عليها لتقدير الانتشار)` : null,
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n---\n");

  return [
    "حلل الإشارات الإعلامية التالية (كل واحدة برقم تعريف id). لكل إشارة اعطي:",
    '1) "entities": لائحة الشخصيات السياسية/المرشحين المرتبطين تحديدا بدائرة تطوان الانتخابية (مرشح فدائرة تطوان، نائب حالي أو سابق عن تطوان، مسؤول حزبي محلي/إقليمي مرتبط بترشيح فتطوان) — ماشي أي شخصية سياسية وطنية مذكورة فالنص. إذا كانت الشخصية من هاد اللائحة المعروفة سلفا (مرشحو دائرة تطوان)، اكتب اسمها بالضبط كما هو هنا بلا تغيير: ' +
      knownList +
      '. إذا كانت شخصية أخرى غير موجودة فهاد اللائحة، زيدها فقط إذا كان النص كيربطها صراحة بترشيح أو تمثيل فدائرة تطوان تحديدا — اكتب اسمها الكامل كما ظهر بالضبط فالنص. مهم: أي شخص يحمل صفة حزبية أو مؤسساتية (أمين عام، كاتب عام، رئيس فرع، عضو مكتب سياسي...) ومذكور فسياق انتخابي/ترشيحي فدائرة تطوان تحديدا يُعتبر مرشحا وخاصو يدخل فاللائحة — لا تستبعد شخصية لمجرد أنها مذكورة بصفتها الحزبية بدل "مرشح" بالحرف. لكن استبعد كليا: وزراء الحكومة، الأمناء العامون للأحزاب على المستوى الوطني، ونواب/مسؤولون سياسيون من دوائر أو جهات أخرى — حتى لو ذُكروا فنفس الخبر — إلا إذا كان النص يربطهم صراحة بدائرة تطوان. إذا ماكاينش أي شخصية مرتبطة بدائرة تطوان، أرجع لائحة فارغة.',
    '2) "influence": تقدير من 0 إلى 100 لقوة/انتشار هاد الإشارة بالضبط — بناء على حجم التفاعل المعطى، شهرة/انتشار المصدر إن كانت معروفة، ومدى بروز الموضوع السياسي (خبر رئيسي كامل عن الشخص = مرتفع، ذكر عابر وسط خبر عام = منخفض).',
    "",
    "أرجع فقط JSON صحيح بلا أي نص إضافي قبله أو بعده، بالشكل التالي بالضبط:",
    '[{"id":"...","entities":["..."],"influence":0}]',
    "",
    "الإشارات:",
    items,
  ].join("\n");
}

function parseJsonResults(raw: string): MentionAiResult[] {
  // النماذج أحيانا كتزيد ```json ... ``` محيطة بالنتيجة رغم التعليمات
  const cleaned = raw.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "");
  const start = cleaned.indexOf("[");
  const end = cleaned.lastIndexOf("]");
  if (start === -1 || end === -1) return [];
  try {
    const parsed = JSON.parse(cleaned.slice(start, end + 1));
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((p) => p && typeof p.id === "string")
      .map((p) => ({
        id: p.id,
        entities: Array.isArray(p.entities) ? p.entities.filter((e: unknown) => typeof e === "string" && e.trim()).map((e: string) => e.trim()) : [],
        influence: Number.isFinite(p.influence) ? Math.max(0, Math.min(100, Number(p.influence))) : 0,
      }));
  } catch {
    return [];
  }
}

const DEFAULT_ANTHROPIC_MODEL = "claude-3-5-haiku-20241022";
const DEFAULT_OPENAI_MODEL = "gpt-4o-mini";
const DEFAULT_GEMINI_MODEL = "gemini-3.5-flash-lite";

async function callAnthropic(prompt: string): Promise<string | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || DEFAULT_ANTHROPIC_MODEL,
        max_tokens: 2000,
        messages: [{ role: "user", content: prompt }],
      }),
      cache: "no-store",
    });
    if (!res.ok) {
      console.error("Anthropic mention-analysis error", res.status, await res.text());
      return null;
    }
    const json = await res.json();
    const text = json?.content?.map((p: any) => p.text ?? "").join("") ?? "";
    return text.trim() || null;
  } catch (err) {
    console.error("Anthropic mention-analysis call failed", err);
    return null;
  }
}

async function callGemini(prompt: string): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  const model = process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 2000 },
      }),
      cache: "no-store",
    });
    if (!res.ok) {
      console.error("Gemini mention-analysis error", res.status, await res.text());
      return null;
    }
    const json = await res.json();
    const text = json?.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join("") ?? "";
    return text.trim() || null;
  } catch (err) {
    console.error("Gemini mention-analysis call failed", err);
    return null;
  }
}

async function callOpenAI(prompt: string): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || DEFAULT_OPENAI_MODEL,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2,
        max_tokens: 2000,
      }),
      cache: "no-store",
    });
    if (!res.ok) {
      console.error("OpenAI mention-analysis error", res.status, await res.text());
      return null;
    }
    const json = await res.json();
    const text = json?.choices?.[0]?.message?.content ?? "";
    return text.trim() || null;
  } catch (err) {
    console.error("OpenAI mention-analysis call failed", err);
    return null;
  }
}

export function isMentionAnalysisConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY || process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY);
}

/**
 * كيحلل دفعة إشارات دفعة وحدة (طلب واحد لكل مزود، ماشي طلب لكل
 * إشارة) — Anthropic أولا، فإلا فشل Gemini، فإلا فشل OpenAI. كيرجع
 * Map بمعرف كل إشارة → نتيجتها. إشارة ما ظهرتش فالنتيجة (فشل كامل
 * الثلاثة، أو النموذج نساها) كتبقى بلا تحليل هاد الدورة، وتترجع
 * للدفعة الجاية.
 */
export async function analyzeMentionsBatch(mentions: MentionForAnalysis[]): Promise<Map<string, MentionAiResult>> {
  if (mentions.length === 0) return new Map();
  const prompt = buildPrompt(mentions);

  let raw = await callAnthropic(prompt);
  if (!raw) raw = await callGemini(prompt);
  if (!raw) raw = await callOpenAI(prompt);
  if (!raw) return new Map();

  const results = parseJsonResults(raw);
  return new Map(results.map((r) => [r.id, r]));
}
