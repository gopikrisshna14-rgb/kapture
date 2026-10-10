import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Streaming metadata would put <link rel="manifest"> in <body>, where Chrome ignores it and the
  // PWA (and its Android share target) becomes uninstallable. Render metadata in <head> for everyone.
  htmlLimitedBots: /.*/,
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
};

export default nextConfig;
