import PageShell from "@/components/PageShell";
import { IconUpload } from "@/components/icons";
import PolibrandImportForm from "./PolibrandImportForm";
import AiAnalysisRunner from "./AiAnalysisRunner";
import { getDictionary } from "@/lib/i18n/getDictionary";

export const dynamic = "force-dynamic";

export default async function ImportPolibrandPage() {
  const { dict } = await getDictionary();
  return (
    <PageShell
      title={dict.importPolibrand.title}
      subtitle={dict.importPolibrand.subtitle}
      icon={<IconUpload />}
    >
      <div
        className="rounded-xl px-5 py-4 mb-6 text-sm leading-relaxed text-white"
        style={{ background: "linear-gradient(120deg, var(--brand-navy) 0%, var(--brand-navy-2) 100%)" }}
      >
        <strong>{dict.import.howToUseTitle}</strong>{dict.importPolibrand.howToUseBody}
      </div>

      <PolibrandImportForm dict={dict} />

      <div className="mt-6">
        <AiAnalysisRunner dict={dict} />
      </div>
    </PageShell>
  );
}
