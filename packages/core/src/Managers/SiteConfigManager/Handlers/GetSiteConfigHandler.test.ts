import { describe, expect, test } from "vitest";

import {
  FakeSiteConfigState,
  fakeSiteConfigAccessor,
} from "../../../Accessors/SiteConfigAccessor/FakeSiteConfigAccessor.test-helper";
import type { Actor } from "../../../Common/Actor";
import { VISITOR } from "../../../Common/Actor";
import type { Profile } from "../../../Common/Profile";
import { createPermissionEngine } from "../../../Composition/createPermissionEngine";
import { REGION_PROFILES } from "../RegionProfiles";
import { GetSiteConfigRequest } from "../Requests/GetSiteConfigRequest";
import { SiteConfigForbiddenResponse } from "../Responses/SiteConfigForbiddenResponse";
import { SiteConfigResponse } from "../Responses/SiteConfigResponse";
import { GetSiteConfigHandler } from "./GetSiteConfigHandler";

const AT = new Date("2026-09-13T10:00:00.000Z");

function profile(overrides: Partial<Profile>): Profile {
  return {
    id: "00000000-0000-4000-8000-000000000010",
    handle: "admin",
    displayName: "Admin",
    avatarUrl: null,
    bio: null,
    role: "admin",
    trustLevel: "trusted",
    status: "active",
    createdAt: AT,
    ...overrides,
  };
}

const ADMIN: Actor = { kind: "member", profile: profile({}) };
const MEMBER: Actor = {
  kind: "member",
  profile: profile({ id: "00000000-0000-4000-8000-000000000011", role: "member" }),
};

function handlerFor(state: FakeSiteConfigState) {
  const siteConfig = fakeSiteConfigAccessor(state);
  const permissions = createPermissionEngine(siteConfig);
  return new GetSiteConfigHandler(siteConfig, permissions, []);
}

describe("GetSiteConfigHandler", () => {
  test("an admin gets the whole snapshot, the region profile, and the duty checklist", async () => {
    const state = new FakeSiteConfigState("staff", "anyone");
    state.region = "US";
    const dutyChecklist = [
      {
        id: "turnstile",
        label: "Turnstile",
        status: "configured" as const,
        setupGuidePath: "docs/setup/turnstile.md",
      },
    ];
    const siteConfig = fakeSiteConfigAccessor(state);
    const permissions = createPermissionEngine(siteConfig);
    const handler = new GetSiteConfigHandler(siteConfig, permissions, dutyChecklist);

    const response = await handler.handle(new GetSiteConfigRequest(ADMIN));

    expect(response).toBeInstanceOf(SiteConfigResponse);
    expect(response).toMatchObject({
      config: { posting: "staff", comments: "anyone", region: "US" },
      regionProfile: REGION_PROFILES.US,
      dutyChecklist,
    });
  });

  test("a plain member is forbidden", async () => {
    const handler = handlerFor(new FakeSiteConfigState("anyone", "anyone"));

    const response = await handler.handle(new GetSiteConfigRequest(MEMBER));

    expect(response).toBeInstanceOf(SiteConfigForbiddenResponse);
    expect(response).toMatchObject({ reason: "not-allowed" });
  });

  test("a visitor is forbidden as signed-out", async () => {
    const handler = handlerFor(new FakeSiteConfigState("anyone", "anyone"));

    const response = await handler.handle(new GetSiteConfigRequest(VISITOR));

    expect(response).toMatchObject({ reason: "signed-out" });
  });
});
