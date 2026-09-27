import { Constants } from "@porchlight/db";
import { expect, test } from "vitest";

import { DIGEST_SCHEDULES } from "../../Common/DigestSchedule";
import { toMemberEmailClaim } from "./toMemberEmailClaim";

const ROW = {
  profile_id: "u1",
  email: "june@example.test",
  unsubscribe_token: "tok",
  kind: "digest",
  window_start: "2026-09-27T10:00:00.000Z",
  window_end: "2026-09-27T11:00:00.000Z",
  counts: { "reply.created": 2 },
};

test("the domain digest schedule union matches the schema enum", () => {
  expect([...DIGEST_SCHEDULES].sort()).toEqual(
    [...Constants.public.Enums.digest_schedule].sort(),
  );
});

test("maps a claimed digest", () => {
  expect(toMemberEmailClaim(ROW)).toEqual({
    profileId: "u1",
    email: "june@example.test",
    unsubscribeToken: "tok",
    kind: "digest",
    windowStart: new Date("2026-09-27T10:00:00.000Z"),
    windowEnd: new Date("2026-09-27T11:00:00.000Z"),
    counts: { "reply.created": 2 },
  });
});

test("drops unknown kinds and counts that are not positive numbers", () => {
  const claim = toMemberEmailClaim({
    ...ROW,
    counts: { "reply.created": 1, "made.up": 4, "item.approved": "3", "mod.action": 0 },
  });
  expect(claim?.counts).toEqual({ "reply.created": 1 });
});

test("a claim of an unknown kind maps to null", () => {
  expect(toMemberEmailClaim({ ...ROW, kind: "weekly" })).toBeNull();
});
