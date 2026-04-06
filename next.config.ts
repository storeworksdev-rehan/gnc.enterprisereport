import type { NextConfig } from "next";

const API_BASE = process.env.NEXT_PUBLIC_SERVER_API || "http://localhost:4000";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${API_BASE}/:path*`,
      },
    ];
  },
};

export default nextConfig;
