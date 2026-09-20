import type { Metadata } from "next";
import "./globals.css";
import { getLocale } from "@/lib/i18n/locale";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return locale === "fr"
    ? {
        title: "Plateforme de gestion de campagne — Tétouan",
        description: "Plateforme de gestion de la campagne de Zouhair Rekkani, circonscription de Tétouan",
      }
    : {
        title: "منصة إدارة الحملة — تطوان",
        description: "منصة إدارة حملة زهير الركاني، دائرة تطوان",
      };
}

const THEME_INIT_SCRIPT = `
(function () {
  try {
    var stored = localStorage.getItem("theme");
    var theme = stored === "dark" || stored === "light" ? stored : "light";
    document.documentElement.setAttribute("data-theme", theme);
  } catch (e) {}
})();
`;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const dir = locale === "ar" ? "rtl" : "ltr";
  return (
    <html lang={locale} dir={dir} suppressHydrationWarning>
      <head>
        {/* بلا وميض عند التحميل: تحديد الوضع (فاتح/داكن) قبل أول render */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
