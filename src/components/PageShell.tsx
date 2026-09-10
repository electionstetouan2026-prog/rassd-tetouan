import Sidebar from "./Sidebar";

export default function PageShell({
  title,
  subtitle,
  icon,
  children,
}: {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-[var(--bg)]">
      <Sidebar />
      <main className="flex-1 p-6 md:p-8 max-w-6xl mx-auto w-full">
        <div
          className="rounded-2xl px-6 py-5 md:px-8 md:py-6 mb-6 flex items-center justify-between gap-4 shadow-lg shadow-black/10"
          style={{ background: "linear-gradient(120deg, var(--brand-navy) 0%, var(--brand-navy-2) 100%)" }}
        >
          <div>
            <h1 className="text-2xl md:text-[28px] font-extrabold text-white">{title}</h1>
            {subtitle && <p className="text-[15px] text-white/65 mt-1.5 max-w-2xl leading-relaxed">{subtitle}</p>}
          </div>
          {icon && (
            <div className="w-14 h-14 rounded-full bg-white/10 border border-white/15 flex items-center justify-center text-white shrink-0">
              {icon}
            </div>
          )}
        </div>
        {children}
      </main>
    </div>
  );
}
