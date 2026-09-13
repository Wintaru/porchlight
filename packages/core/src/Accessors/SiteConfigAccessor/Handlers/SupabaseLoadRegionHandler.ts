import type { DbClient } from "@porchlight/db";

import type { IHandler } from "../../../Common/IHandler";
import { DEFAULT_REGION, REGIONS, type Region } from "../../../Common/Region";
import type { LoadRegionRequest } from "../Requests/LoadRegionRequest";
import { RegionLoadedResponse } from "../Responses/RegionLoadedResponse";
import { SiteConfigAccessFailedResponse } from "../Responses/SiteConfigAccessFailedResponse";

const REGION_KEY = "region";

function isRegion(value: unknown): value is Region {
  return REGIONS.some((region) => region === value);
}

// The value column is jsonb; the key holds a JSON string. An absent row is the default
// (the key is seeded by #12), an unknown value is a failure, never a silent default.
export class SupabaseLoadRegionHandler implements IHandler<
  LoadRegionRequest,
  RegionLoadedResponse | SiteConfigAccessFailedResponse
> {
  constructor(private readonly db: DbClient) {}

  async handle(
    request: LoadRegionRequest,
  ): Promise<RegionLoadedResponse | SiteConfigAccessFailedResponse> {
    const { data, error } = await this.db
      .from("site_config")
      .select("value")
      .eq("key", REGION_KEY)
      .maybeSingle();
    if (error) {
      return new SiteConfigAccessFailedResponse(request.correlationId, error.message);
    }
    if (data === null) {
      return new RegionLoadedResponse(request.correlationId, DEFAULT_REGION);
    }
    if (!isRegion(data.value)) {
      return new SiteConfigAccessFailedResponse(
        request.correlationId,
        `site_config.${REGION_KEY} holds ${JSON.stringify(data.value)}, not one of ${REGIONS.join(", ")}`,
      );
    }
    return new RegionLoadedResponse(request.correlationId, data.value);
  }
}
