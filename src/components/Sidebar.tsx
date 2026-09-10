"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import ThemeToggle from "./ThemeToggle";

const NAV_ITEMS = [
  { href: "/", label: "لوحة القيادة", icon: "📊" },
  { href: "/mentions", label: "الإشارات", icon: "📰" },
  { href: "/observers", label: "المراقبون", icon: "🧑‍💼" },
  { href: "/ciblage", label: "الاستهداف (Ciblage)", icon: "🎯" },
  { href: "/settings", label: "الإعدادات", icon: "⚙️" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="w-60 shrink-0 min-h-screen flex flex-col justify-between p-4"
      style={{ background: "linear-gradient(180deg, var(--brand-navy) 0%, var(--brand-navy-2) 100%)" }}
    >
      <div>
        <div className="text-white font-bold text-lg mb-6 px-2">منصة رصد تطوان</div>
        <nav className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition ${
                  active ? "bg-[var(--brand-blue)] text-white" : "text-white/80 hover:bg-white/10"
                }`}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="space-y-1">
        <ThemeToggle />
        <form action="/logout" method="post">
          <button
            type="submit"
            className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-white/80 hover:bg-white/10 transition"
          >
            <span>🚪</span>
            <span>خروج</span>
          </button>
        </form>
      </div>
    </aside>
  );
}
