import { Constants } from "@porchlight/db";
import { expect, test } from "vitest";

import { REACTION_KINDS } from "../../Common/ReactionKind";

// The insert's `kind` assignment proves every domain value is in the schema enum. This
// proves the reverse, so the two sets are equal, not merely overlapping (D9).
test("the domain reaction kind union matches the schema enum", () => {
  expect([...REACTION_KINDS].sort()).toEqual(
    [...Constants.public.Enums.reaction_kind].sort(),
  );
});
