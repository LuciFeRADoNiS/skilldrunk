import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // Deprecated — admin moved to its own subdomain
      {
        source: "/admin",
        destination: "https://admin.skilldrunk.com",
        permanent: true,
      },
      {
        source: "/admin/:path*",
        destination: "https://admin.skilldrunk.com/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
