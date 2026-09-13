import { describe, expect, test } from "vitest";

import {
  FakeSiteConfigState,
  fakeSiteConfigAccessor,
} from "../../../Accessors/SiteConfigAccessor/FakeSiteConfigAccessor.test-helper";
import type { Actor } from "../../../Common/Actor";
import type { Profile } from "../../../Common/Profile";
import { createPermissionEngine } from "../../../Composition/createPermissionEngine";
import { ApplyPresetRequest } from "../Requests/ApplyPresetRequest";
import { SiteConfigForbiddenResponse } from "../Responses/SiteConfigForbiddenResponse";
import { SiteConfigSavedResponse } from "../Responses/SiteConfigSavedResponse";
import { ApplyPresetHandler } from "./ApplyPresetHandler";

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

function handlerAndState(): {
  handler: ApplyPresetHandler;
  state: FakeSiteConfigState;
} {
  const state = new FakeSiteConfigState("anyone", "anyone");
  const siteConfig = fakeSiteConfigAccessor(state);
  const permissions = createPermissionEngine(siteConfig);
  return { handler: new ApplyPresetHandler(siteConfig, permissions), state };
}

describe("ApplyPresetHandler", () => {
  test("just_me writes staff posting, anyone comments, closed sign-up", async () => {
    const { handler, state } = handlerAndState();

    const response = await handler.handle(new ApplyPresetRequest(ADMIN, "just_me"));

    expect(response).toBeInstanceOf(SiteConfigSavedResponse);
    expect(state.stored).toEqual([
      { key: "posting", value: "staff" },
      { key: "comments", value: "anyone" },
      { key: "sign_up", value: "closed" },
    ]);
  });

  test("open_porch writes anyone posting, anyone comments, open sign-up", async () => {
    const { handler, state } = handlerAndState();

    const response = await handler.handle(new ApplyPresetRequest(ADMIN, "open_porch"));

    expect(response).toBeInstanceOf(SiteConfigSavedResponse);
    expect(state.stored).toEqual([
      { key: "posting", value: "anyone" },
      { key: "comments", value: "anyone" },
      { key: "sign_up", value: "open" },
    ]);
  });

  test("a plain member may not apply a preset", async () => {
    const { handler, state } = handlerAndState();

    const response = await handler.handle(new ApplyPresetRequest(MEMBER, "just_me"));

    expect(response).toBeInstanceOf(SiteConfigForbiddenResponse);
    expect(state.stored).toEqual([]);
  });
});
