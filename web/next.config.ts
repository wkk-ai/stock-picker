import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Hostinger build fails on warnings/noise; keep typecheck via tsc in CI if needed
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
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
};

export default nextConfig;
