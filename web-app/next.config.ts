import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    const backendUrl = process.env.BACKEND_URL ?? "http://localhost:4000";
    return [
      { source: "/api/backend/:path*", destination: `${backendUrl}/api/v1/:path*` },
      { source: "/api/auth/:path*", destination: `${backendUrl}/api/auth/:path*` },
    ];
  },
};

export default nextConfig;
