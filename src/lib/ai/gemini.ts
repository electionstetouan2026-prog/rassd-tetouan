/**
 * عميل بسيط لـGemini API (REST مباشر، بلا SDK) — يُستعمل غير لتوليد
 * ملخص الترتيب التنافسي اليومي (T-062). مصمم يفشل بهدوء (يرجع null)
 * بلا ما يوقف الصفحة إذا المفتاح ناقص أو الطلب فشل.
 *
 * الموديل قابل للتعديل عبر GEMINI_MODEL (بيئة) باش نقدر نبدلو بلا
 * تعديل كود — Google كتبدل أسماء الموديلات بزاف (3.5/3.6/3.8...).
 * الافتراضي "gemini-3.5-flash-lite": الأرخص/الأقرب للمجانية دابا (شتنبر 2026).
 */

const DEFAULT_MODEL = "gemini-3.5-flash-lite";

export function isGeminiConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

export async function generateWithGemini(prompt: string): Promise<{ text: string; model: string } | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const model = process.env.GEMINI_MODEL || DEFAULT_MODEL;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.4, maxOutputTokens: 600 },
      }),
      cache: "no-store",
    });
    if (!res.ok) {
      console.error("Gemini API error", res.status, await res.text());
      return null;
    }
    const json = await res.json();
    const text = json?.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join("") ?? "";
    if (!text.trim()) return null;
    return { text: text.trim(), model };
  } catch (err) {
    console.error("Gemini API call failed", err);
    return null;
  }
}
