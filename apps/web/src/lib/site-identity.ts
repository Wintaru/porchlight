import {
  DEFAULT_SITE_IDENTITY,
  GetSiteIdentityRequest,
  SiteIdentityResponse,
  type SiteIdentity,
} from "@porchlight/core";
import { cache } from "react";

import { getDependencyContainer } from "@/lib/dependency-container";

// `site_config.site_name`, `.site_tagline`, `.about_md` (SPEC.md §4): every page title,
// the feed header, and the branded preview card use `site_name`, so a self-hosted blog
// never says "Porchlight" unless the admin chose that name. Falls back to the default
// identity on a `site_config` hiccup, the same resilience the notification bell uses —
// a page must render even when this one read fails. `cache()` dedupes the read across
// `generateMetadata` and the page component for one request, same as `getAuthor`/`getTag`.
export const getSiteIdentity = cache(async (): Promise<SiteIdentity> => {
  try {
    const response = await getDependencyContainer().siteConfigManager.query(
      new GetSiteIdentityRequest(),
    );
    return response instanceof SiteIdentityResponse
      ? response.identity
      : DEFAULT_SITE_IDENTITY;
  } catch (error: unknown) {
    console.error("site identity load failed", error);
    return DEFAULT_SITE_IDENTITY;
  }
});
