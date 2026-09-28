import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // The e2e suite runs a second dev server with a Turnstile test key beside the main one
  // (playwright.config.ts, #103). Next allows one dev server per build folder, so the
  // second one builds into its own folder under .next.
  distDir: process.env.PORCHLIGHT_DIST_DIR ?? ".next",
  // Workspace packages ship TypeScript source, so Next compiles them in place.
  transpilePackages: ["@porchlight/core", "@porchlight/db"],
  // RFC 9728's well-known path for the MCP door's metadata (#79, D25). The route lives
  // under /api because a folder whose name starts with a dot is skipped by the
  // TypeScript and lint globs, so a route there would go unchecked.
  // The OAuth consent page (#79) must never render inside another site's frame, where a
  // hidden overlay could trick a member into pressing Allow.
  headers: () =>
    Promise.resolve([
      {
        source: "/oauth/consent",
        headers: [
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
          { key: "X-Frame-Options", value: "DENY" },
        ],
      },
    ]),
  rewrites: () =>
    Promise.resolve([
      {
        source: "/.well-known/oauth-protected-resource/:resource*",
        destination: "/api/oauth-protected-resource/:resource*",
      },
    ]),
};

export default nextConfig;
