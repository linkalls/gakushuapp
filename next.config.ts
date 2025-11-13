import type { NextConfig } from "next";

const nextConfig: NextConfig = {
 webpack: (config) => {
        config.externals.push('bun:sqlite');
        return config;
    },
};

export default nextConfig;
