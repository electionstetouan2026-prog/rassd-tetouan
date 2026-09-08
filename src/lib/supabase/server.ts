import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/** عميل Supabase من جانب السيرفر — يقرا/يكتب الكوكيز الحقيقية ديال الجلسة. */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // كيوقع فServer Components اللي ما كيقدروش يكتبو كوكيز مباشرة —
            // middleware.ts هو اللي كيدير refresh للجلسة فهاد الحالة
          }
        },
      },
    }
  );
}

/** عميل بصلاحية service_role — للعمليات الخلفية (جامع RSS، تحليل AI)
 *  اللي كتخدم بلا جلسة مستخدم، وكتتجاوز RLS عمدا. ما يُستعملش من صفحة كتقرا مباشرة طلب مستخدم. */
export function createServiceRoleClient() {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { createClient: createSupabaseClient } = require("@supabase/supabase-js");
  return createSupabaseClient(
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}
