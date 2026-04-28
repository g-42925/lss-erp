import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingRoot: __dirname,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: "wooden-plum-woodpecker.myfilebase.com",
      },
    ],
  },
};

export default nextConfig;
