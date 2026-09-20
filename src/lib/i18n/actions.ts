"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { LOCALE_COOKIE_NAME, type Locale } from "./locale";

// كيبدل لغة الواجهة (كوكي سنة كاملة) وكيعاود يحمل الصفحة الحالية باللغة
// الجديدة — مستعمل من زر تبديل اللغة فـ Sidebar
export async function setLocale(locale: Locale) {
  const store = await cookies();
  store.set(LOCALE_COOKIE_NAME, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  revalidatePath("/", "layout");
}
