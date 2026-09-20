import { setLocale } from "@/lib/i18n/actions";
import type { Locale } from "@/lib/i18n/locale";
import { IconGlobe } from "./icons";

export default function LanguageSwitcher({
  locale,
  labelFr,
  labelAr,
}: {
  locale: Locale;
  labelFr: string;
  labelAr: string;
}) {
  const next: Locale = locale === "ar" ? "fr" : "ar";
  return (
    <form action={setLocale.bind(null, next)}>
      <button
        type="submit"
        className="w-full flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-[15px] font-bold text-white/70 hover:bg-white/10 transition"
      >
        <IconGlobe />
        <span>{locale === "ar" ? labelFr : labelAr}</span>
      </button>
    </form>
  );
}
