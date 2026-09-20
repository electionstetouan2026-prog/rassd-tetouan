import { cookies } from "next/headers";

export type Locale = "ar" | "fr";

const COOKIE_NAME = "locale";

// كنقراو لغة الواجهة المختارة من الكوكي (بلا كوكي = عربية بالدفاع)
export async function getLocale(): Promise<Locale> {
  const store = await cookies();
  const v = store.get(COOKIE_NAME)?.value;
  return v === "fr" ? "fr" : "ar";
}

export const LOCALE_COOKIE_NAME = COOKIE_NAME;
