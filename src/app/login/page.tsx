"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError("البريد أو كلمة السر غير صحيحة");
      return;
    }
    router.replace("/");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--surface)]" dir="rtl">
      <div className="w-full max-w-sm rounded-2xl border border-[var(--border)] bg-[var(--card)] p-8 shadow-sm">
        <h1 className="text-xl font-bold text-[var(--brand-navy)] mb-1">منصة إدارة الحملة — تطوان</h1>
        <p className="text-sm text-[var(--muted)] mb-6">تسجيل الدخول — للفريق المخول فقط</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm mb-1">البريد الإلكتروني</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-[var(--border)] px-3 py-2 bg-transparent focus:outline-none focus:ring-2 focus:ring-[var(--brand-blue)]"
            />
          </div>
          <div>
            <label className="block text-sm mb-1">كلمة السر</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-[var(--border)] px-3 py-2 bg-transparent focus:outline-none focus:ring-2 focus:ring-[var(--brand-blue)]"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-[var(--brand-blue)] text-white py-2 font-medium hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "..." : "دخول"}
          </button>
        </form>
      </div>
    </div>
  );
}
