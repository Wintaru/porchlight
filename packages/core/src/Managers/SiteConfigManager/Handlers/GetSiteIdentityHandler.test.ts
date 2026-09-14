import { describe, expect, test } from "vitest";

import {
  FakeSiteConfigState,
  fakeSiteConfigAccessor,
} from "../../../Accessors/SiteConfigAccessor/FakeSiteConfigAccessor.test-helper";
import { DEFAULT_SITE_IDENTITY } from "../../../Common/SiteIdentity";
import { GetSiteIdentityRequest } from "../Requests/GetSiteIdentityRequest";
import { SiteIdentityResponse } from "../Responses/SiteIdentityResponse";
import { GetSiteIdentityHandler } from "./GetSiteIdentityHandler";

describe("GetSiteIdentityHandler", () => {
  test("a visitor with no actor still gets the site identity", async () => {
    const state = new FakeSiteConfigState("anyone", "anyone");
    state.siteIdentity = {
      siteName: "The Wren House",
      siteTagline: "Notes from a small porch.",
      aboutMd: "We are neighbors.",
    };
    const handler = new GetSiteIdentityHandler(fakeSiteConfigAccessor(state));

    const response = await handler.handle(new GetSiteIdentityRequest());

    expect(response).toBeInstanceOf(SiteIdentityResponse);
    expect(response).toMatchObject({ identity: state.siteIdentity });
  });

  test("defaults to Porchlight when nothing has been set", async () => {
    const state = new FakeSiteConfigState("anyone", "anyone");
    const handler = new GetSiteIdentityHandler(fakeSiteConfigAccessor(state));

    const response = await handler.handle(new GetSiteIdentityRequest());

    expect(response).toMatchObject({ identity: DEFAULT_SITE_IDENTITY });
  });
});
