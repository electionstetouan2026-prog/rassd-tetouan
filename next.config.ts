import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // الحد الافتراضي لـServer Actions هو 1MB — صغير بزاف لملفات بوليبراند
  // المصدَّرة (Presse/Facebook/Instagram) اللي كيوصل مجموعها لعدة
  // ميغابايت. راجع commit 17 شتنبر 2026 (استيراد بوليبراند).
  experimental: {
    serverActions: {
      bodySizeLimit: "15mb",
    },
  },
};

export default nextConfig;
