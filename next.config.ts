import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "placeholders.io",
      }
    ]
  },
  // Hide the on-screen Next.js dev indicator (the bottom-left bubble shown
  // during `next dev`). Compile/runtime errors are still surfaced.
  devIndicators: false,
  allowedDevOrigins: ["*"],
  async rewrites() {
    // Static apps in public/apps/* — serve folder index files on clean URLs.
    // (public/ has no directory-index fallback, and [...slug] would redirect.)
    const apps = ["landing", "agent", "blog"];
    const rules = [
      { source: "/apps", destination: "/apps/landing/index.html" },
      { source: "/apps/", destination: "/apps/landing/index.html" },
    ];
    for (const a of apps) {
      rules.push(
        { source: `/apps/${a}`, destination: `/apps/${a}/index.html` },
        { source: `/apps/${a}/`, destination: `/apps/${a}/index.html` },
      );
    }
    return rules;
  },
  async headers() {
    // Only cache-control headers here. CSP and CORS are handled exclusively in proxy.ts
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
          { key: "Pragma", value: "no-cache" },
          { key: "Expires", value: "0" },
        ],
      },
    ];
  },
};

export default nextConfig;
