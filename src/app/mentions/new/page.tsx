import PageShell from "@/components/PageShell";
import { createManualMention } from "./actions";

export default function NewMentionPage() {
  return (
    <PageShell title="إدخال يدوي — فيسبوك/انستغرام/تيكتوك">
      <form action={createManualMention} className="space-y-4 max-w-xl">
        <div>
          <label className="block text-sm mb-1">المنصة (إلزامي)</label>
          <select
            name="platform"
            required
            defaultValue=""
            className="w-full rounded-lg border border-[var(--border)] px-3 py-2 bg-[var(--card)]"
          >
            <option value="" disabled>
              اختر المنصة
            </option>
            <option value="facebook">فيسبوك</option>
            <option value="instagram">انستغرام</option>
            <option value="tiktok">تيكتوك</option>
            <option value="other">أخرى</option>
          </select>
        </div>
        <div>
          <label className="block text-sm mb-1">العنوان</label>
          <input
            name="title"
            className="w-full rounded-lg border border-[var(--border)] px-3 py-2 bg-[var(--card)]"
          />
        </div>
        <div>
          <label className="block text-sm mb-1">المحتوى / النص</label>
          <textarea
            name="content"
            rows={5}
            className="w-full rounded-lg border border-[var(--border)] px-3 py-2 bg-[var(--card)]"
          />
        </div>
        <div>
          <label className="block text-sm mb-1">الرابط (اختياري)</label>
          <input
            name="url"
            type="url"
            className="w-full rounded-lg border border-[var(--border)] px-3 py-2 bg-[var(--card)]"
          />
        </div>
        <p className="text-xs text-[var(--muted)]">
          هاد الإدخال غيتسجل بهويتك (uploaded_by) وفـسجل التدقيق — شفافية كاملة.
        </p>
        <button
          type="submit"
          className="rounded-lg bg-[var(--brand-blue)] text-white px-6 py-2 font-medium"
        >
          حفظ
        </button>
      </form>
    </PageShell>
  );
}
