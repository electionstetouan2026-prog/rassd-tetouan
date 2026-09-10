"use client";

import { useEffect, useState } from "react";
import { IconSun, IconMoon } from "./icons";

export default function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const current = document.documentElement.getAttribute("data-theme");
    setTheme(current === "dark" ? "dark" : "light");
  }, []);

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("theme", next);
    } catch {}
  }

  return (
    <button
      onClick={toggle}
      className="w-full flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-[15px] font-bold text-white/70 hover:bg-white/10 transition"
    >
      {theme === "dark" ? <IconSun /> : <IconMoon />}
      <span>{theme === "dark" ? "وضع فاتح" : "وضع داكن"}</span>
    </button>
  );
}
