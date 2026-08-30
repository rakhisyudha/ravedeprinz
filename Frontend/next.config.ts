import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "ravedeprinz.me" },
      { protocol: "https", hostname: "www.ravedeprinz.me" },
      { protocol: "http", hostname: "localhost" },
    ],
  },
};

export default nextConfig;
