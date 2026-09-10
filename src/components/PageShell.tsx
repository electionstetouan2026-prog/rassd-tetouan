import Sidebar from "./Sidebar";

export default function PageShell({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-[var(--bg)]">
      <Sidebar />
      <main className="flex-1 p-8 max-w-6xl mx-auto w-full">
        <h1 className="text-2xl font-extrabold text-[var(--brand-navy)] mb-6 pb-3 border-b-2 border-[var(--text)]/15">
          {title}
        </h1>
        {children}
      </main>
    </div>
  );
}
