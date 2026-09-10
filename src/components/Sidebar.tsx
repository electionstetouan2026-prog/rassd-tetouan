"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import ThemeToggle from "./ThemeToggle";

const NAV_ITEMS = [
  { href: "/", label: "لوحة القيادة" },
  { href: "/observers", label: "المراقبون" },
  { href: "/presence", label: "خريطة الحضور" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="w-64 shrink-0 min-h-screen flex flex-col justify-between p-4 border-l border-black/10"
      style={{ background: "linear-gradient(180deg, var(--brand-navy) 0%, var(--brand-navy-2) 100%)" }}
    >
      <div>
        <div className="flex items-center gap-3 px-2 mb-8 mt-2">
          <div
            className="w-10 h-10 rounded-full border-2 border-dashed flex items-center justify-center text-[11px] font-extrabold shrink-0"
            style={{ borderColor: "var(--brand-blue-hover)", color: "var(--brand-blue-hover)" }}
          >
            ز
          </div>
          <div className="text-[#f2e9d6] font-extrabold text-sm leading-tight">
            دفتر الحملة
            <div className="text-[11px] font-normal text-[#c9b98f] mt-0.5">حملة زهير الركاني — تطوان</div>
          </div>
        </div>
        <nav className="space-y-2">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`block rounded-lg rounded-e-none border-e-4 px-4 py-2.5 text-sm font-semibold transition ${
                  active
                    ? "bg-[#fdf8ea] text-[var(--brand-navy)]"
                    : "border-transparent text-[#e7dcc0] hover:bg-white/5"
                }`}
                style={active ? { borderColor: "var(--brand-blue)" } : undefined}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="space-y-1 border-t border-dashed border-white/15 pt-3">
        <ThemeToggle />
        <form action="/logout" method="post">
          <button
            type="submit"
            className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-[#e7dcc0] hover:bg-white/5 transition"
          >
            <span>خروج</span>
          </button>
        </form>
      </div>
    </aside>
  );
}
