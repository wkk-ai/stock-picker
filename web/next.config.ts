import type { NextConfig } from "next";

const isStatic = process.env.NEXT_PUBLIC_STATIC_EXPORT === "1";
// Empty string is a valid "no prefix" (phone preview / Hostinger).
// Only default to /stock-picker when the env var is unset.
const basePath = isStatic
  ? (process.env.NEXT_PUBLIC_BASE_PATH === undefined
      ? "/stock-picker"
      : process.env.NEXT_PUBLIC_BASE_PATH)
  : "";

const nextConfig: NextConfig = {
  ...(isStatic
    ? {
        output: "export" as const,
        trailingSlash: true,
        basePath: basePath || undefined,
        assetPrefix: basePath || undefined,
      }
    : {
        async rewrites() {
          if (process.env.NEXT_PUBLIC_USE_PYTHON_API === "1") {
            return [
              {
                source: "/api/:path*",
                destination: "http://127.0.0.1:8000/api/:path*",
              },
            ];
          }
          return [];
        },
      }),
  images: { unoptimized: true },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
