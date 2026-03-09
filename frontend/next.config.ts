import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // API proxying is now handled by src/app/api/[...path]/route.ts
  // This gives us full control over headers (bypasses Vercel edge auth injection)
};

export default nextConfig;
