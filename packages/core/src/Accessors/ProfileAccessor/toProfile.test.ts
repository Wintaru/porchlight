import { Constants } from "@porchlight/db";
import { describe, expect, test } from "vitest";

import { PROFILE_STATUSES } from "../../Common/ProfileStatus";
import { TRUST_LEVELS } from "../../Common/TrustLevel";
import { USER_ROLES } from "../../Common/UserRole";
import { toProfile } from "./toProfile";

// The domain unions in Common are a copy of the schema's enums (Common cannot import
// packages/db). This is the guard for that copy: a value added on either side without the
// other fails here, in both directions.
describe("the domain unions match the schema enums", () => {
  test.each([
    ["user_role", USER_ROLES],
    ["trust_level", TRUST_LEVELS],
    ["profile_status", PROFILE_STATUSES],
  ] as const)("%s", (enumName, domainValues) => {
    expect([...Constants.public.Enums[enumName]].sort()).toEqual(
      [...domainValues].sort(),
    );
  });
});

describe("toProfile", () => {
  test("maps the row's columns and parses the timestamp", () => {
    expect(
      toProfile({
        id: "u1",
        handle: "june",
        display_name: "June Park",
        avatar_url: null,
        bio: null,
        role: "member",
        trust_level: "probation",
        status: "active",
        created_at: "2026-09-12T08:00:00+00:00",
      }),
    ).toEqual({
      id: "u1",
      handle: "june",
      displayName: "June Park",
      avatarUrl: null,
      bio: null,
      role: "member",
      trustLevel: "probation",
      status: "active",
      createdAt: new Date("2026-09-12T08:00:00Z"),
    });
  });
});
