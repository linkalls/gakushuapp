import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  output: "standalone",
  typescript: {
    // ビルド時の型エラーを無視
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
