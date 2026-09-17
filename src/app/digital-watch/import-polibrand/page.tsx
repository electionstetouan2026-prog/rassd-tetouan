import PageShell from "@/components/PageShell";
import { IconUpload } from "@/components/icons";
import PolibrandImportForm from "./PolibrandImportForm";
import AiAnalysisRunner from "./AiAnalysisRunner";

export const dynamic = "force-dynamic";

export default function ImportPolibrandPage() {
  return (
    <PageShell
      title="استيراد بوليبراند"
      subtitle="رفع الملفات المصدَّرة يدويا من صفحة /mentions فبوليبراند (زر Exporter) — يومي أو كل يومين حسب توفرك"
      icon={<IconUpload />}
    >
      <div
        className="rounded-xl px-5 py-4 mb-6 text-sm leading-relaxed text-white"
        style={{ background: "linear-gradient(120deg, var(--brand-navy) 0%, var(--brand-navy-2) 100%)" }}
      >
        <strong>كيفاش تستعملها</strong>: دخل لبوليبراند، صفحة "Mentions"، صدّر (Exporter) الفترة اللي بغيتي —
        منصة وحدة فكل مرة (Facebook أو Instagram أو Presse). رفع الملف تحت فخانته المطابقة. المنصة كتخزن كل
        الإشارات فأرشيف كامل، وكتزيد تلقائيا فـ"اليقظة الرقمية" غير الإشارات اللي فيها اسم المرشح أو اسم منافس
        مسمّى (بلا الأخبار المحلية العامة اللي ماعلاقتها بالحملة). إعادة رفع نفس الفترة بالغلط ماشي مشكل — الإشارات
        المستوردة مسبقا (بنفس الرابط) كتتافى تلقائيا.
      </div>

      <PolibrandImportForm />

      <div className="mt-6">
        <AiAnalysisRunner />
      </div>
    </PageShell>
  );
}
