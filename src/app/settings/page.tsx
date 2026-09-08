import PageShell from "@/components/PageShell";

function KeyStatus({ label, connected }: { label: string; connected: boolean }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 flex justify-between items-center">
      <span className="font-medium">{label}</span>
      <span
        className={`text-xs rounded-full px-3 py-1 ${
          connected ? "bg-green-600 text-white" : "bg-[var(--surface)] text-[var(--muted)]"
        }`}
      >
        {connected ? "متصل" : "غير مربوط بعد"}
      </span>
    </div>
  );
}

export default function SettingsPage() {
  const gemini = Boolean(process.env.GEMINI_API_KEY);
  const anthropic = Boolean(process.env.ANTHROPIC_API_KEY);
  const openai = Boolean(process.env.OPENAI_API_KEY);

  return (
    <PageShell title="الإعدادات">
      <div className="space-y-3 max-w-lg mb-8">
        <KeyStatus label="Gemini (مرحلة 1 + مرحلة 2)" connected={gemini} />
        <KeyStatus label="Anthropic Claude (مرحلة 1 + مرحلة 2)" connected={anthropic} />
        <KeyStatus label="OpenAI (حكم أخير نادر)" connected={openai} />
      </div>
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 text-sm text-[var(--muted)] max-w-lg">
        <p className="mb-2">
          <strong>بنية التحليل بمرحلتين:</strong> كل إشارة كتتحلل أولا بزوج رخيص (Gemini 3.6
          Flash + Claude Haiku 4.5). إلا اختلفو، كتصعد لزوج غالي (Gemini 3.1 Pro + Claude Opus
          4.8)، وGPT-5 Nano كحكم أخير نادر جدا.
        </p>
        <p>هاد الصفحة كتعكس حالة المفاتيح الحقيقية فالسيرفر بلا عرض أي قيمة — مؤشر حقيقي ماشي مزخرف.</p>
      </div>
    </PageShell>
  );
}
