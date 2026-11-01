import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  images: {
    remotePatterns: [{ protocol: "https", hostname: "*.spotifycdn.com" }, { protocol: "https", hostname: "i.scdn.co" }],
  },
  // Ambient moved to its own site, and Madera Tools links to it
  async redirects() {
    return [{ source: "/ambient", destination: "/madera-tools", permanent: true }];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
