import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: false,
});

const nextConfig: NextConfig = {
  turbopack: {},
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

export default withPWA(nextConfig);
