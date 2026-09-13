import { Constants } from "@porchlight/db";
import { expect, test } from "vitest";

import { MOD_ACTION_KINDS } from "./ModActionKind";

// MOD_ACTION_KINDS restates the schema's mod_action_kind enum by hand, because Common
// cannot import packages/db (SPEC.md §7). SupabaseRecordModActionHandler only checks
// this union is a *subset* of the generated type at compile time — an insert compiles
// even if the schema enum grows a value this union never adds. This test is the other
// direction, so the two sets are equal, not merely overlapping.
test("the domain mod action kind union matches the schema enum", () => {
  expect([...MOD_ACTION_KINDS].sort()).toEqual(
    [...Constants.public.Enums.mod_action_kind].sort(),
  );
});
