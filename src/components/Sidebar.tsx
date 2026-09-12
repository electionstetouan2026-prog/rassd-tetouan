"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import ThemeToggle from "./ThemeToggle";
import { IconDashboard, IconPeople, IconMap, IconTasks, IconEye, IconChart, IconLogout } from "./icons";

const NAV_ITEMS = [
  { href: "/", label: "لوحة القيادة", Icon: IconDashboard },
  { href: "/observers", label: "المراقبون", Icon: IconPeople },
  { href: "/presence", label: "خريطة الحضور", Icon: IconMap },
  { href: "/field-tasks", label: "البرنامج الميداني", Icon: IconTasks },
  { href: "/digital-watch", label: "اليقظة الرقمية", Icon: IconEye },
  { href: "/ranking", label: "الترتيب التنافسي", Icon: IconChart },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="w-64 shrink-0 min-h-screen flex flex-col justify-between p-4"
      style={{ background: "linear-gradient(180deg, var(--brand-navy) 0%, var(--brand-navy-2) 100%)" }}
    >
      <div>
        <div className="flex items-center gap-3 px-2 mb-8 mt-2">
          <div className="w-11 h-11 rounded-xl bg-[var(--brand-blue)] flex items-center justify-center text-white font-extrabold text-lg shrink-0">
            ز
          </div>
          <div>
            <div className="text-white font-extrabold text-base leading-tight">حملة تطوان 2026</div>
            <div className="text-[13px] text-white/55 mt-0.5">نظام إدارة الحملة</div>
          </div>
        </div>
        <nav className="space-y-1.5">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href;
            const Icon = item.Icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-xl px-3.5 py-3 text-[15px] font-bold transition ${
                  active ? "bg-[var(--brand-blue)] text-white shadow-lg shadow-black/20" : "text-white/70 hover:bg-white/10"
                }`}
              >
                <Icon />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="space-y-1 border-t border-white/10 pt-3">
        <ThemeToggle />
        <form action="/logout" method="post">
          <button
            type="submit"
            className="w-full flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-[15px] font-bold text-white/70 hover:bg-white/10 transition"
          >
            <IconLogout />
            <span>خروج</span>
          </button>
        </form>
      </div>
    </aside>
  );
}
