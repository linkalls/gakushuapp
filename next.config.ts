import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  /* config options here */
  output: "standalone",
  typescript: {
    // ビルド時の型エラーを無視
    ignoreBuildErrors: true,
  },
};

export default withNextIntl(nextConfig);
