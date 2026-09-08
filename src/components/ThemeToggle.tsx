"use client";

import { useEffect, useState } from "react";

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
      className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-white/80 hover:bg-white/10 transition"
    >
      <span>{theme === "dark" ? "☀️" : "🌙"}</span>
      <span>{theme === "dark" ? "وضع فاتح" : "وضع داكن"}</span>
    </button>
  );
}
