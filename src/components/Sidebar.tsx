"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import ThemeToggle from "./ThemeToggle";
import LanguageSwitcher from "./LanguageSwitcher";
import type { Dictionary } from "@/lib/i18n/getDictionary";
import type { Locale } from "@/lib/i18n/locale";
import { IconDashboard, IconPeople, IconMap, IconTasks, IconEye, IconChart, IconShield, IconFlame, IconPhone, IconHeartHand, IconIdBadge, IconBuilding, IconTarget, IconLandmark, IconUpload, IconLogout } from "./icons";

function buildNavItems(nav: Dictionary["nav"]) {
  return [
    { href: "/", label: nav.dashboard, Icon: IconDashboard },
    { href: "/observers", label: nav.observers, Icon: IconPeople },
    { href: "/presence", label: nav.presence, Icon: IconMap },
    { href: "/field-tasks", label: nav.fieldTasks, Icon: IconTasks },
    { href: "/voter-contact", label: nav.voterContact, Icon: IconPhone },
    { href: "/volunteers", label: nav.volunteers, Icon: IconHeartHand },
    { href: "/activists", label: nav.activists, Icon: IconIdBadge },
    { href: "/polling-stations", label: nav.pollingStations, Icon: IconBuilding },
    { href: "/hot-blocks", label: nav.hotBlocks, Icon: IconFlame },
    { href: "/stronghold-map", label: nav.strongholdMap, Icon: IconTarget },
    { href: "/electoral-context", label: nav.electoralContext, Icon: IconLandmark },
    { href: "/candidates", label: nav.candidates, Icon: IconIdBadge },
    { href: "/import", label: nav.importGeneral, Icon: IconUpload },
    { href: "/monitoring-reports", label: nav.monitoringReports, Icon: IconShield },
    { href: "/digital-watch", label: nav.digitalWatch, Icon: IconEye },
    { href: "/ranking", label: nav.ranking, Icon: IconChart },
  ];
}

export default function Sidebar({ dict, locale }: { dict: Dictionary; locale: Locale }) {
  const pathname = usePathname();
  const NAV_ITEMS = buildNavItems(dict.nav);

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
            <div className="text-white font-extrabold text-base leading-tight">{dict.sidebar.campaignName}</div>
            <div className="text-[13px] text-white/55 mt-0.5">{dict.sidebar.systemLabel}</div>
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
                prefetch={false}
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
        <LanguageSwitcher locale={locale} labelFr={dict.sidebar.switchToFrench} labelAr={dict.sidebar.switchToArabic} />
        <ThemeToggle lightLabel={dict.sidebar.lightMode} darkLabel={dict.sidebar.darkMode} />
        <form action="/logout" method="post">
          <button
            type="submit"
            className="w-full flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-[15px] font-bold text-white/70 hover:bg-white/10 transition"
          >
            <IconLogout />
            <span>{dict.sidebar.logout}</span>
          </button>
        </form>
      </div>
    </aside>
  );
}
