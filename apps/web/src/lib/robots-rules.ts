import type { MetadataRoute } from "next";

// Project Arachnid verifies domain ownership by looking for a User-Agent line of the form
// ProjectArachnid/<token> in robots.txt (docs/setup/hash-matching.md). The token is per
// domain, so it is configuration, not code. It is public once served, so not a secret.
const ARACHNID_USER_AGENT_PREFIX = "ProjectArachnid/";

export function robotsRules(
  arachnidToken: string | undefined,
): MetadataRoute.Robots["rules"] {
  const everyone = { userAgent: "*", allow: "/" };
  const token = arachnidToken?.trim() ?? "";
  if (token === "") {
    return everyone;
  }
  return [everyone, { userAgent: `${ARACHNID_USER_AGENT_PREFIX}${token}`, allow: "/" }];
}
