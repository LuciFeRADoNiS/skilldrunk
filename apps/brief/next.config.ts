import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@skilldrunk/supabase", "@skilldrunk/sd-ui"],
};

export default nextConfig;
