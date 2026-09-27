import type { MetadataRoute } from "next";

import { robotsRules } from "@/lib/robots-rules";
import { SITE_URL } from "@/lib/site";

// Read the Arachnid token per request, so a host that sets env only at runtime (a
// prebuilt image) still serves the verification line.
export const dynamic = "force-dynamic";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: robotsRules(process.env.ARACHNID_VERIFICATION_TOKEN),
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
