import { Constants } from "@porchlight/db";
import { expect, test } from "vitest";

import { MEMBER_BLOCK_LEVELS } from "../../Common/MemberBlockLevel";
import { toMemberBlock } from "./toMemberBlock";

test("the core's levels are exactly the database enum's", () => {
  expect([...MEMBER_BLOCK_LEVELS].sort()).toEqual(
    [...Constants.public.Enums.member_block_level].sort(),
  );
});

test("a row becomes a MemberBlock with a Date", () => {
  expect(
    toMemberBlock({
      member_id: "m",
      target_id: "t",
      level: "block",
      created_at: "2026-09-26T10:00:00.000Z",
    }),
  ).toEqual({
    memberId: "m",
    targetId: "t",
    level: "block",
    createdAt: new Date("2026-09-26T10:00:00.000Z"),
  });
});
