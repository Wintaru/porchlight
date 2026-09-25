import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Workspace packages ship TypeScript source, so Next compiles them in place.
  transpilePackages: ["@porchlight/core", "@porchlight/db"],
  turbopack: {
    resolveAlias: {
      // The image re-encoder (#36) is server-only; see src/lib/sharp-browser-stub.ts.
      sharp: { browser: "./src/lib/sharp-browser-stub.ts" },
    },
  },
};

export default nextConfig;
