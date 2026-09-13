import PageShell from "@/components/PageShell";
import { IconUpload } from "@/components/icons";
import ImportForm from "./ImportForm";
import { IMPORT_TARGETS } from "@/lib/importEngine";

export const dynamic = "force-dynamic";

export default function ImportPage() {
  const targets = Object.values(IMPORT_TARGETS);

  return (
    <PageShell
      title="استيراد عام (CSV / Excel)"
      subtitle="استيراد دفعي للمتطوعين/المناضلين/مسؤولي الحزب/المراقبين من ملف CSV أو Excel، بدل الإدخال اليدوي صف بصف"
      icon={<IconUpload />}
    >
      <div
        className="rounded-xl px-5 py-4 mb-6 text-sm leading-relaxed text-white"
        style={{ background: "linear-gradient(120deg, var(--brand-navy) 0%, var(--brand-navy-2) 100%)" }}
      >
        <strong>كيفاش تستعملها</strong>: حضّر ملف CSV أو Excel بصف أول فيه أسماء الأعمدة بالضبط كما فاللائحة تحت كل
        نوع بيانات (بالعربية). "الاسم الكامل" هو العمود الوحيد الإلزامي — أي صف بلا اسم كامل يتجاوز ويُذكر فالنتيجة.
        عمود "الجماعة" (إذا كاين) خاصو يطابق اسم الجماعة بالضبط كما مسجل فالمنصة (تطوان، أزلا، إلخ) — إذا ماطابقش،
        كيتسجل الشخص بلا ربط جماعة، بلا ما يمنع الاستيراد. بالنسبة للمراقبين: "الجماعة" + "رقم المكتب" (أو "اسم
        المركز") كيتستعملو مع بعض باش تتربط كل مراقب بمكتب التصويت المطابق تلقائيا — إذا تعذّرت المطابقة، كيتسجل
        المراقب بحالة "لم يُعيّن" ويمكن ربطه يدويا من صفحة المراقبين بعد الاستيراد. إذا الملف عندك فيه الاسم مقسّم
        فعمودين ("النسب" و"الإسم" مثلا) بدل عمود واحد "الاسم الكامل"، ماشي مشكل — المنصة كتركبهم تلقائيا.
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {targets.map((t) => (
          <section key={t.key} className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm">
            <h2 className="font-extrabold text-[var(--heading)] mb-2">{t.label}</h2>
            <p className="text-xs text-[var(--muted)] mb-2">أسماء الأعمدة المتوقعة (صف أول فالملف):</p>
            <ul className="text-sm space-y-1">
              {t.fields.map((f) => (
                <li key={f.key} className="flex items-center gap-1.5">
                  <span className="font-bold text-[var(--text)]">{f.headers[0]}</span>
                  {f.required && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: "var(--severity-high)", color: "white" }}>
                      إلزامي
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <ImportForm />
    </PageShell>
  );
}
