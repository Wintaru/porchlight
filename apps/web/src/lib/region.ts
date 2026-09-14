import {
  DEFAULT_REGION,
  GetRegionRequest,
  RegionResponse,
  REGION_PROFILES,
  type Region,
  type RegionProfile,
} from "@porchlight/core";
import { cache } from "react";

import { getDependencyContainer } from "@/lib/dependency-container";

// `site_config.region` (SPEC.md §7): the code of conduct page's reporting-target
// paragraph reads this for every visitor. Falls back to the default region's profile on
// a `site_config` hiccup, the same resilience `getSiteIdentity` uses — the page must
// still render. `cache()` dedupes the read for one request.
export const getRegion = cache(
  async (): Promise<{
    region: Region;
    profile: RegionProfile;
  }> => {
    try {
      const response = await getDependencyContainer().siteConfigManager.query(
        new GetRegionRequest(),
      );
      return response instanceof RegionResponse
        ? { region: response.region, profile: response.profile }
        : { region: DEFAULT_REGION, profile: REGION_PROFILES[DEFAULT_REGION] };
    } catch (error: unknown) {
      console.error("region load failed", error);
      return { region: DEFAULT_REGION, profile: REGION_PROFILES[DEFAULT_REGION] };
    }
  },
);
