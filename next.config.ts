import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone output for Docker deploys (e.g. Hetzner VPS).
  output: "standalone",
  // Native/wasm-bearing packages must not be bundled.
  serverExternalPackages: ["@resvg/resvg-js", "satori"],
  images: {
    remotePatterns: [{ protocol: "https", hostname: "res.cloudinary.com" }],
    // Explicitly allow the quality used by marketing heroes (required in Next 16).
    qualities: [75, 80],
  },
};

export default nextConfig;
