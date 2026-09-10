import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "منصة إدارة الحملة — تطوان",
  description: "منصة إدارة حملة زهير الركاني، دائرة تطوان",
};

const THEME_INIT_SCRIPT = `
(function () {
  try {
    var stored = localStorage.getItem("theme");
    var theme = stored === "dark" || stored === "light" ? stored : "light";
    document.documentElement.setAttribute("data-theme", theme);
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <head>
        {/* بلا وميض عند التحميل: تحديد الوضع (فاتح/داكن) قبل أول render */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
