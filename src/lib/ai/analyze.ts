import { extractJson, MODELS, providers } from "./providers";

export interface AnalysisResult {
  region_relevant: boolean;
  region_relevance_reason: string;
  threat_score: number;
  threat_score_reason: string;
  threat_model_used: string;
  threat_confidence: number;
}

interface RawJudgement {
  region_relevant: boolean;
  region_relevance_reason: string;
  threat_score: number;
  threat_score_reason: string;
}

function buildPrompt(mention: { title: string | null; content: string | null }): string {
  return `أنت محلل سياسي مختص فرصد حملة زهير الركاني (PPS) بدائرة تطوان، انتخابات 23 شتنبر 2026.
حلل هاد الإشارة وجاوب بـJSON فقط (بلا أي نص زايد)، بهاد الشكل بالضبط:
{"region_relevant": true|false, "region_relevance_reason": "...", "threat_score": 0-100, "threat_score_reason": "..."}

- region_relevant: واش هاد المحتوى مرتبط فعليا بدائرة تطوان و/أو بالمرشح و/أو بالحملة (ماشي خبر وطني عام بلا علاقة)؟
- threat_score: من 0 (إيجابي/محايد) لـ100 (تهديد كبير — هجوم مباشر، معلومة كاذبة، فضيحة). كن شفاف فالسبب.

العنوان: ${mention.title ?? "(بلا عنوان)"}
المحتوى: ${mention.content ?? "(بلا محتوى)"}`;
}

function agree(a: RawJudgement, b: RawJudgement): boolean {
  return a.region_relevant === b.region_relevant && Math.abs(a.threat_score - b.threat_score) <= 15;
}

function average(a: RawJudgement, b: RawJudgement): RawJudgement {
  return {
    region_relevant: a.region_relevant, // متفقين أصلا فهاد الحالة
    region_relevance_reason: a.region_relevance_reason,
    threat_score: Math.round((a.threat_score + b.threat_score) / 2),
    threat_score_reason: `${a.threat_score_reason} | ${b.threat_score_reason}`,
  };
}

async function runPair(
  geminiModel: string,
  claudeModel: string,
  prompt: string
): Promise<{ gemini?: RawJudgement; claude?: RawJudgement }> {
  const [geminiRes, claudeRes] = await Promise.allSettled([
    providers.callGemini(geminiModel, prompt).then((t) => extractJson<RawJudgement>(t)),
    providers.callClaude(claudeModel, prompt).then((t) => extractJson<RawJudgement>(t)),
  ]);

  return {
    gemini: geminiRes.status === "fulfilled" ? geminiRes.value : undefined,
    claude: claudeRes.status === "fulfilled" ? claudeRes.value : undefined,
  };
}

/**
 * التصميم النهائي بمرحلتين (D-009/D-015): مرحلة 1 رخيصة لكل الإشارات،
 * تصعيد لمرحلة 2 الغالية غير عند الاختلاف، وGPT-5 Nano كحكم أخير نادر جدا.
 * أي فشل فمزود (quota، مفتاح ناقص...) كيتفادى بصمت — النظام كيخدم بصدق
 * بأقل عدد نتائج متوفرة، وthreat_model_used كيسجل هاد الشيء بوضوح.
 */
export async function analyzeMention(mention: {
  title: string | null;
  content: string | null;
}): Promise<AnalysisResult> {
  const prompt = buildPrompt(mention);

  const stage1 = await runPair(MODELS.stage1.gemini, MODELS.stage1.claude, prompt);

  if (stage1.gemini && stage1.claude && agree(stage1.gemini, stage1.claude)) {
    const merged = average(stage1.gemini, stage1.claude);
    return {
      ...merged,
      threat_model_used: `${MODELS.stage1.gemini}+${MODELS.stage1.claude} (اتفقو مرحلة 1)`,
      threat_confidence: 0.9,
    };
  }

  // حالة حدودية/اختلاف، أو فشل مزود فمرحلة 1 — نصعدو لمرحلة 2
  const stage2 = await runPair(MODELS.stage2.gemini, MODELS.stage2.claude, prompt);

  if (stage2.gemini && stage2.claude && agree(stage2.gemini, stage2.claude)) {
    const merged = average(stage2.gemini, stage2.claude);
    return {
      ...merged,
      threat_model_used: `${MODELS.stage2.gemini}+${MODELS.stage2.claude} (اتفقو مرحلة 2)`,
      threat_confidence: 0.8,
    };
  }

  if (stage2.gemini && stage2.claude) {
    // مرحلة 2 تانيها اختلفو — حكم أخير نادر من GPT-5 Nano
    try {
      const judgeText = await providers.callOpenAI(
        MODELS.finalJudge.openai,
        `${prompt}\n\nنموذجين آخرين اختلفو فتقييم هاد الإشارة:\nالأول: ${JSON.stringify(
          stage2.gemini
        )}\nالثاني: ${JSON.stringify(
          stage2.claude
        )}\nحسم أنت النتيجة النهائية بنفس شكل JSON.`
      );
      const judged = extractJson<RawJudgement>(judgeText);
      return {
        ...judged,
        threat_model_used: `${MODELS.finalJudge.openai} (حكم أخير بعد اختلاف مرحلة 2)`,
        threat_confidence: 0.7,
      };
    } catch {
      // OpenAI بلا رصيد فعلي (D-015) — نعتمدو Opus وحدو بثقة أقل، بصدق
      return {
        ...stage2.claude,
        threat_model_used: `${MODELS.stage2.claude} (وحيد — اختلاف مرحلة 2 وGPT-5 Nano غير متاح)`,
        threat_confidence: 0.5,
      };
    }
  }

  // فشل مزود واحد فمرحلة 2 — نعتمدو الآخر بثقة أقل، بصدق
  const single = stage2.gemini ?? stage2.claude ?? stage1.gemini ?? stage1.claude;
  if (!single) {
    throw new Error("كل مزودي الذكاء الاصطناعي فشلو — ماقدرناش نحللو هاد الإشارة");
  }
  return {
    ...single,
    threat_model_used: "نموذج وحيد متاح (فشل البقية — شوف السجل)",
    threat_confidence: 0.4,
  };
}
