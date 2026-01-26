import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // PWA will be handled via service worker registration in client
  // next-pwa has compatibility issues with Next.js 16, so we'll use a custom approach
  turbopack: {},
};

export default nextConfig;
