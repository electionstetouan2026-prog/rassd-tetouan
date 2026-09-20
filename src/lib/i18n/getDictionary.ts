import { getLocale, type Locale } from "./locale";
import ar from "./dictionaries/ar";
import fr from "./dictionaries/fr";

export type Dictionary = typeof ar;

// كنجيبو القاموس المناسب حسب اللغة المختارة (كوكي) — كيستعمل فكل صفحة
// server component باش يعرض النصوص بلغة المستخدم
export async function getDictionary(): Promise<{ dict: Dictionary; locale: Locale }> {
  const locale = await getLocale();
  return { dict: locale === "fr" ? fr : ar, locale };
}
