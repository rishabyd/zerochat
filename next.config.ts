import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Don't fail production builds on lint errors (pre-existing, unrelated to Tailwind migration)
  },
  images: {
    domains: ["source.unsplash.com"],
  },
};

export default nextConfig;
