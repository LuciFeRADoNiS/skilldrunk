import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@skilldrunk/supabase", "@skilldrunk/sd-ui", "@skilldrunk/analytics"],
};

export default nextConfig;
