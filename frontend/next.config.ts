import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
      {
        protocol: "http",
        hostname: "**",
      },
    ],
  },
  sassOptions: {
    includPaths: [path.join(__dirname, "styles")],
    additionalData: `@use "@/styles/_mixins.scss" as *;
   @use "@/styles/_variables.scss" as *;`,
  },
};

export default nextConfig;
