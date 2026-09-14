import { describe, expect, test } from "vitest";

import {
  FakeSiteConfigState,
  fakeSiteConfigAccessor,
} from "../../../Accessors/SiteConfigAccessor/FakeSiteConfigAccessor.test-helper";
import { DEFAULT_REGION } from "../../../Common/Region";
import { GetRegionRequest } from "../Requests/GetRegionRequest";
import { REGION_PROFILES } from "../RegionProfiles";
import { RegionResponse } from "../Responses/RegionResponse";
import { GetRegionHandler } from "./GetRegionHandler";

describe("GetRegionHandler", () => {
  test("a visitor with no actor gets the region and its profile", async () => {
    const state = new FakeSiteConfigState("anyone", "anyone");
    state.region = "UK";
    const handler = new GetRegionHandler(fakeSiteConfigAccessor(state));

    const response = await handler.handle(new GetRegionRequest());

    expect(response).toBeInstanceOf(RegionResponse);
    expect(response).toMatchObject({ region: "UK", profile: REGION_PROFILES.UK });
  });

  test("defaults to the fallback region when nothing has been set", async () => {
    const state = new FakeSiteConfigState("anyone", "anyone");
    const handler = new GetRegionHandler(fakeSiteConfigAccessor(state));

    const response = await handler.handle(new GetRegionRequest());

    expect(response).toMatchObject({
      region: DEFAULT_REGION,
      profile: REGION_PROFILES[DEFAULT_REGION],
    });
  });
});
