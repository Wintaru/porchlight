import { describe, expect, test } from "vitest";

import type { Actor } from "../Common/Actor";
import type { Profile } from "../Common/Profile";
import { GetTagDescriptionRequest } from "../Managers/SiteConfigManager/Requests/GetTagDescriptionRequest";
import { SetTagDescriptionRequest } from "../Managers/SiteConfigManager/Requests/SetTagDescriptionRequest";
import { SiteConfigForbiddenResponse } from "../Managers/SiteConfigManager/Responses/SiteConfigForbiddenResponse";
import { SiteConfigInvalidResponse } from "../Managers/SiteConfigManager/Responses/SiteConfigInvalidResponse";
import { SiteConfigSavedResponse } from "../Managers/SiteConfigManager/Responses/SiteConfigSavedResponse";
import { TagDescriptionResponse } from "../Managers/SiteConfigManager/Responses/TagDescriptionResponse";
import { TAG_DESCRIPTION_MAX_LENGTH } from "../Managers/SiteConfigManager/tagDescription";
import { DependencyContainer } from "./DependencyContainer";
import { FAKE_ENV } from "./FakeEnvironment.test-helper";

// Issue #24: an admin says what a tag is for, and the tag page shows it rendered
// through the post body's engine.

const AT = new Date("2026-09-26T10:00:00.000Z");

function profile(overrides: Partial<Profile>): Profile {
  return {
    id: "00000000-0000-4000-8000-000000000001",
    handle: "lamplighter",
    displayName: null,
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
const THEO: Actor = {
  kind: "member",
  profile: profile({
    id: "00000000-0000-4000-8000-000000000003",
    handle: "theo",
    role: "member",
  }),
};

describe("DependencyContainer: tag descriptions (#24)", () => {
  test("an admin writes a description and anyone reads it rendered", async () => {
    const container = new DependencyContainer(FAKE_ENV);
    await expect(
      container.siteConfigManager.execute(
        new SetTagDescriptionRequest(ADMIN, "hiking", "Trails, **boots** and weather."),
      ),
    ).resolves.toBeInstanceOf(SiteConfigSavedResponse);
    const read = await container.siteConfigManager.query(
      new GetTagDescriptionRequest("hiking"),
    );
    expect(read).toBeInstanceOf(TagDescriptionResponse);
    expect(read).toMatchObject({ descriptionMd: "Trails, **boots** and weather." });
    expect((read as TagDescriptionResponse).html).toContain("<strong>boots</strong>");
  });

  test("a member cannot, and a description has a length cap", async () => {
    const container = new DependencyContainer(FAKE_ENV);
    await expect(
      container.siteConfigManager.execute(
        new SetTagDescriptionRequest(THEO, "hiking", "Mine."),
      ),
    ).resolves.toBeInstanceOf(SiteConfigForbiddenResponse);
    await expect(
      container.siteConfigManager.execute(
        new SetTagDescriptionRequest(
          ADMIN,
          "hiking",
          "x".repeat(TAG_DESCRIPTION_MAX_LENGTH + 1),
        ),
      ),
    ).resolves.toBeInstanceOf(SiteConfigInvalidResponse);
  });
});
