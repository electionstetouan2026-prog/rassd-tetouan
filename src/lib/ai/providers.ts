/**
 * طبقة نداء نماذج الذكاء الاصطناعي الثلاثة (D-009/D-015).
 * كل دالة كترجع نص خام (JSON متوقع جوا النص) أو كترمي خطأ — الاستدعاء المسؤول
 * (analyze.ts) هو اللي كيدير catch ويتعامل مع الفشل بصمت (بحال ضربة quota).
 */

async function callGemini(model: string, prompt: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY غير موجود");

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2, responseMimeType: "application/json" },
      }),
    }
  );
  if (!res.ok) throw new Error(`Gemini ${model} فشل: ${res.status} ${await res.text()}`);
  const json = await res.json();
  const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error(`Gemini ${model}: رد فارغ`);
  return text;
}

async function callClaude(model: string, prompt: string): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY غير موجود");

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!res.ok) throw new Error(`Claude ${model} فشل: ${res.status} ${await res.text()}`);
  const json = await res.json();
  const text = json.content?.[0]?.text;
  if (!text) throw new Error(`Claude ${model}: رد فارغ`);
  return text;
}

async function callOpenAI(model: string, prompt: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY غير موجود");

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    }),
  });
  if (!res.ok) throw new Error(`OpenAI ${model} فشل: ${res.status} ${await res.text()}`);
  const json = await res.json();
  const text = json.choices?.[0]?.message?.content;
  if (!text) throw new Error(`OpenAI ${model}: رد فارغ`);
  return text;
}

/** يستخرج أول JSON object صالح من نص (بعض النماذج كترجع ```json ... ``` أو نص زايد حوله). */
export function extractJson<T>(text: string): T {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("ما لقيتش JSON فرد النموذج");
  return JSON.parse(match[0]) as T;
}

export const MODELS = {
  stage1: {
    gemini: "gemini-3.6-flash",
    claude: "claude-haiku-4-5-20251001",
  },
  stage2: {
    gemini: "gemini-3.1-pro-preview",
    claude: "claude-opus-4-8",
  },
  finalJudge: {
    openai: "gpt-5-nano",
  },
} as const;

export const providers = { callGemini, callClaude, callOpenAI };
