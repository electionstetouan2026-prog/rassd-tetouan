import PageShell from "@/components/PageShell";

function maskKey(value: string | undefined) {
  if (!value) return null;
  const tail = value.slice(-4);
  return `•••••••••${tail}`;
}

function KeyCard({
  label,
  masked,
  modelLine,
  description,
}: {
  label: string;
  masked: string | null;
  modelLine: string;
  description: string;
}) {
  const connected = Boolean(masked);
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 flex flex-col md:flex-row md:items-center gap-3 md:gap-6">
      <div className="font-mono text-xs text-[var(--muted)] bg-[var(--surface)] rounded-lg px-3 py-2 md:w-40 shrink-0">
        {masked ?? "غير مربوط"}
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span
            className={`inline-block w-2 h-2 rounded-full ${
              connected ? "bg-green-600" : "bg-[var(--muted)]"
            }`}
          />
          <span className="text-xs font-medium">{connected ? "متصل" : "غير مربوط بعد"}</span>
          <span className="font-semibold">{label}</span>
        </div>
        <p className="text-sm mb-1">{modelLine}</p>
        <p className="text-xs text-[var(--muted)]">{description}</p>
      </div>
    </div>
  );
}

function StepCard({ n, title, text }: { n: number; title: string; text: string }) {
  return (
    <div className="flex gap-3">
      <span className="shrink-0 w-6 h-6 rounded-full bg-[var(--brand-blue)] text-white text-xs flex items-center justify-center mt-0.5">
        {n}
      </span>
      <div>
        <p className="text-sm font-medium mb-0.5">{title}</p>
        <p className="text-xs text-[var(--muted)]">{text}</p>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const gemini = maskKey(process.env.GEMINI_API_KEY);
  const anthropic = maskKey(process.env.ANTHROPIC_API_KEY);
  const openai = maskKey(process.env.OPENAI_API_KEY);

  return (
    <PageShell title="الإعدادات">
      <p className="text-sm text-[var(--muted)] mb-6 max-w-2xl">
        حالة مفاتيح الذكاء الاصطناعي (AI) وكيفاش كيوظفو فخط التحليل — بلا تزويق.
      </p>

      <h2 className="text-lg font-semibold mb-3">مفاتيح API</h2>
      <div className="space-y-3 max-w-2xl mb-8">
        <KeyCard
          label="Gemini (Google)"
          masked={gemini}
          modelLine="Gemini 3.6 Flash — المرحلة 1"
          description="أول تحليل سريع لكل إشارة بالتوازي، مع Claude Haiku."
        />
        <KeyCard
          label="Claude (Anthropic)"
          masked={anthropic}
          modelLine="Claude Haiku 4.5 + Opus 4.8 — المرحلة 1 و2"
          description="Haiku للمرحلة الأولى، Opus كحكم فاصل عند الاختلاف."
        />
        <KeyCard
          label="OpenAI"
          masked={openai}
          modelLine="GPT-5 Nano — حكم أخير نادر"
          description="المفتاح مربوط لكن الرصيد المجاني = $0، فهاد الدور معطل حاليا (كيتفادى الفشل بصمت، ويبقى Opus كيفاش الحكم الأخير)."
        />
      </div>

      <h2 className="text-lg font-semibold mb-3">كيفاش كيخدم التحليل</h2>
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 max-w-2xl space-y-4 mb-6">
        <StepCard
          n={1}
          title="مرحلة أولى — قراءة سريعة مزدوجة"
          text="كل إشارة كيحللوها Gemini Flash وClaude Haiku بالتوازي. إلا اتفقو (نفس التصنيف + فرق تقييم ≤20) → النتيجة نهائية بثقة عالية."
        />
        <StepCard
          n={2}
          title="مرحلة ثانية — حكم فاصل"
          text="غير عند الاختلاف: Gemini Pro وClaude Opus (إن أمكن) كيحكمو، بثقة أعلى شوية."
        />
        <StepCard
          n={3}
          title="حكم أخير نادر"
          text="GPT-5 Nano كتيبريكر — معطل حاليا لغياب رصيد OpenAI، الكود جاهز وكيتفادى الفشل بصمت."
        />
      </div>

      <p className="text-xs text-[var(--muted)] max-w-2xl">
        ملاحظة: هاد الصفحة كتعكس حالة المفاتيح الحقيقية فالسيرفر بلا عرض أي قيمة كاملة — مؤشر حقيقي ماشي
        مزخرف. كل تقييم للإشارات فصفحة &quot;الإشارات&quot; مرفوق بسبب مكتوب من طرف النموذج المستعمل.
      </p>
    </PageShell>
  );
}
