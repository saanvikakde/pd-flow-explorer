import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Pin the project root (there's an unrelated package-lock.json in the home folder).
  turbopack: { root: __dirname },
};

export default nextConfig;
