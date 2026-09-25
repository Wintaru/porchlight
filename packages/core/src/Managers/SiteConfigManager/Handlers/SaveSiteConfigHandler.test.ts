import { describe, expect, test } from "vitest";

import {
  FakeSiteConfigState,
  fakeSiteConfigAccessor,
} from "../../../Accessors/SiteConfigAccessor/FakeSiteConfigAccessor.test-helper";
import type { Actor } from "../../../Common/Actor";
import { VISITOR } from "../../../Common/Actor";
import { DEFAULT_MODERATION_THRESHOLDS } from "../../../Common/ModerationThresholds";
import type { Profile } from "../../../Common/Profile";
import { createPermissionEngine } from "../../../Composition/createPermissionEngine";
import type { SiteConfigSnapshot } from "../SiteConfigSnapshot";
import { SaveSiteConfigRequest } from "../Requests/SaveSiteConfigRequest";
import { SiteConfigForbiddenResponse } from "../Responses/SiteConfigForbiddenResponse";
import { SiteConfigInvalidResponse } from "../Responses/SiteConfigInvalidResponse";
import { SiteConfigSavedResponse } from "../Responses/SiteConfigSavedResponse";
import { SaveSiteConfigHandler } from "./SaveSiteConfigHandler";

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
  handler: SaveSiteConfigHandler;
  state: FakeSiteConfigState;
} {
  const state = new FakeSiteConfigState("anyone", "anyone");
  const siteConfig = fakeSiteConfigAccessor(state);
  const permissions = createPermissionEngine(siteConfig);
  return { handler: new SaveSiteConfigHandler(siteConfig, permissions), state };
}

describe("SaveSiteConfigHandler", () => {
  test("an admin saves posting and it is written as one entry", async () => {
    const { handler, state } = handlerAndState();

    const response = await handler.handle(
      new SaveSiteConfigRequest(ADMIN, { posting: "staff" }),
    );

    expect(response).toBeInstanceOf(SiteConfigSavedResponse);
    expect(state.stored).toEqual([{ key: "posting", value: "staff" }]);
  });

  test("agent limits are stored snake_case, and disclosure as its value (#30)", async () => {
    const { handler, state } = handlerAndState();

    const response = await handler.handle(
      new SaveSiteConfigRequest(ADMIN, {
        agentLimits: { draftsPerDay: 10, publishesPerDay: 0 },
        agentDisclosure: "off",
      }),
    );

    expect(response).toBeInstanceOf(SiteConfigSavedResponse);
    expect(state.stored).toEqual([
      { key: "agent_disclosure", value: "off" },
      { key: "agent_limits", value: { drafts_per_day: 10, publishes_per_day: 0 } },
    ]);
  });

  test("a negative or fractional agent limit is invalid", async () => {
    const { handler } = handlerAndState();
    for (const draftsPerDay of [-1, 2.5, 1001]) {
      const response = await handler.handle(
        new SaveSiteConfigRequest(ADMIN, {
          agentLimits: { draftsPerDay, publishesPerDay: 2 },
        }),
      );
      expect(response).toMatchObject({ field: "agentLimits" });
    }
  });

  test("site identity writes three keys", async () => {
    const { handler, state } = handlerAndState();

    const response = await handler.handle(
      new SaveSiteConfigRequest(ADMIN, {
        siteIdentity: { siteName: "The Porch", siteTagline: "hi", aboutMd: "# hi" },
      }),
    );

    expect(response).toBeInstanceOf(SiteConfigSavedResponse);
    expect(state.stored).toEqual([
      { key: "site_name", value: "The Porch" },
      { key: "site_tagline", value: "hi" },
      { key: "about_md", value: "# hi" },
    ]);
  });

  test("an empty site name is invalid", async () => {
    const { handler, state } = handlerAndState();

    const response = await handler.handle(
      new SaveSiteConfigRequest(ADMIN, {
        siteIdentity: { siteName: "  ", siteTagline: "", aboutMd: "" },
      }),
    );

    expect(response).toBeInstanceOf(SiteConfigInvalidResponse);
    expect(response).toMatchObject({ field: "siteIdentity" });
    expect(state.stored).toEqual([]);
  });

  test("an unknown attachment extension is invalid", async () => {
    const { handler } = handlerAndState();

    const response = await handler.handle(
      new SaveSiteConfigRequest(ADMIN, { attachmentAllowlist: ["exe"] }),
    );

    expect(response).toBeInstanceOf(SiteConfigInvalidResponse);
    expect(response).toMatchObject({ field: "attachmentAllowlist" });
  });

  test("moderation thresholds may be lowered", async () => {
    const { handler, state } = handlerAndState();

    const response = await handler.handle(
      new SaveSiteConfigRequest(ADMIN, {
        moderationThresholds: { flagAt: 0.3, lockAt: 0.8 },
      }),
    );

    expect(response).toBeInstanceOf(SiteConfigSavedResponse);
    expect(state.stored).toEqual([
      { key: "moderation_thresholds", value: { flag_at: 0.3, lock_at: 0.8 } },
    ]);
  });

  test("moderation thresholds may not be raised above the shipped default", async () => {
    const { handler } = handlerAndState();

    const response = await handler.handle(
      new SaveSiteConfigRequest(ADMIN, {
        moderationThresholds: {
          flagAt: DEFAULT_MODERATION_THRESHOLDS.flagAt + 0.1,
          lockAt: DEFAULT_MODERATION_THRESHOLDS.lockAt,
        },
      }),
    );

    expect(response).toBeInstanceOf(SiteConfigInvalidResponse);
    expect(response).toMatchObject({ field: "moderationThresholds" });
  });

  test("auto-promote must be null or at least the minimum", async () => {
    const { handler } = handlerAndState();

    const response = await handler.handle(
      new SaveSiteConfigRequest(ADMIN, { autoPromoteAfterApprovedPosts: 0 }),
    );

    expect(response).toBeInstanceOf(SiteConfigInvalidResponse);
    expect(response).toMatchObject({ field: "autoPromoteAfterApprovedPosts" });
  });

  test("auto-promote null (off) is valid", async () => {
    const { handler, state } = handlerAndState();

    const response = await handler.handle(
      new SaveSiteConfigRequest(ADMIN, { autoPromoteAfterApprovedPosts: null }),
    );

    expect(response).toBeInstanceOf(SiteConfigSavedResponse);
    expect(state.stored).toEqual([
      { key: "auto_promote_after_approved_posts", value: null },
    ]);
  });

  test("a quota with maxFileBytes above maxAccountBytes is invalid", async () => {
    const { handler } = handlerAndState();
    const bad: SiteConfigSnapshot["attachmentQuotaByTrust"] = {
      probation: { maxFileBytes: 100, maxAccountBytes: 100 },
      trusted: { maxFileBytes: 500, maxAccountBytes: 100 },
    };

    const response = await handler.handle(
      new SaveSiteConfigRequest(ADMIN, { attachmentQuotaByTrust: bad }),
    );

    expect(response).toBeInstanceOf(SiteConfigInvalidResponse);
    expect(response).toMatchObject({ field: "attachmentQuotaByTrust" });
  });

  test("a plain member may not save", async () => {
    const { handler, state } = handlerAndState();

    const response = await handler.handle(
      new SaveSiteConfigRequest(MEMBER, { posting: "staff" }),
    );

    expect(response).toBeInstanceOf(SiteConfigForbiddenResponse);
    expect(response).toMatchObject({ reason: "not-allowed" });
    expect(state.stored).toEqual([]);
  });

  test("a visitor is forbidden as signed-out", async () => {
    const { handler } = handlerAndState();

    const response = await handler.handle(
      new SaveSiteConfigRequest(VISITOR, { posting: "staff" }),
    );

    expect(response).toMatchObject({ reason: "signed-out" });
  });

  test("an empty update saves nothing and still succeeds", async () => {
    const { handler, state } = handlerAndState();

    const response = await handler.handle(new SaveSiteConfigRequest(ADMIN, {}));

    expect(response).toBeInstanceOf(SiteConfigSavedResponse);
    expect(state.stored).toEqual([]);
  });
});
