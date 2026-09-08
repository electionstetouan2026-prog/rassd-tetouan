import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * كل المسارات إلا: _next/static, _next/image, favicon.ico، الصور —
     * حماية كل صفحات المنصة إلا /login و/api (الاستثناء الفعلي مبني جوا middleware.ts)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
