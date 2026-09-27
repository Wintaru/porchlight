import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Workspace packages ship TypeScript source, so Next compiles them in place.
  transpilePackages: ["@porchlight/core", "@porchlight/db"],
  // RFC 9728's well-known path for the MCP door's metadata (#79, D25). The route lives
  // under /api because a folder whose name starts with a dot is skipped by the
  // TypeScript and lint globs, so a route there would go unchecked.
  rewrites: () =>
    Promise.resolve([
      {
        source: "/.well-known/oauth-protected-resource/:resource*",
        destination: "/api/oauth-protected-resource/:resource*",
      },
    ]),
};

export default nextConfig;
