import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // The dev indicator defaults to bottom-left, which overlaps the sidebar
  // footer. Move it to bottom-right so the footer text isn't covered.
  // (Dev-only; absent from production builds.)
  devIndicators: { position: "bottom-right" },
}

export default nextConfig
