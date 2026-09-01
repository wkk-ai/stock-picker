import type { NextConfig } from "next";

const isStatic = process.env.NEXT_PUBLIC_STATIC_EXPORT === "1";
const basePath = isStatic ? process.env.NEXT_PUBLIC_BASE_PATH || "/stock-picker" : "";

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
