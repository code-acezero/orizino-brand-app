import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: { ignoreBuildErrors: true },
  transpilePackages: ["@orizino/ui", "@orizino/shared", "@orizino/supabase"],
  serverExternalPackages: ["docx", "@opentelemetry/api", "bwip-js"],
  experimental: {
    serverActions: {
      allowedOrigins: ["*"],
    },
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        "node:async_hooks": false,
        async_hooks: false,
        "node:crypto": false,
        crypto: false,
        "node:stream": false,
        stream: false,
        "node:os": false,
        os: false,
        "node:path": false,
        path: false,
        "node:buffer": false,
        buffer: false,
        "node:util": false,
        util: false,
        fs: false,
        net: false,
        tls: false,
      };
    }
    return config;
  },
};

export default nextConfig;
