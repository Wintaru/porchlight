import { describe, expect, it } from "vitest";

import type { ModerationTarget } from "../../../Common/ModerationTarget";
import {
  ESCALATED_LOOKUP_BATCH_SIZE,
  escalatedLookupBatches,
} from "./escalatedLookupBatches";

function uuid(n: number): string {
  return `00000000-0000-4000-8000-${n.toString(16).padStart(12, "0")}`;
}

describe("escalatedLookupBatches", () => {
  it("splits a full queue into requests that stay well under a gateway's URL limit", () => {
    const targets: ModerationTarget[] = Array.from({ length: 1000 }, (_, n) => ({
      kind: n % 2 === 0 ? "post" : "comment",
      id: uuid(n),
    }));
    const batches = escalatedLookupBatches(targets);
    expect(batches).toHaveLength(1000 / ESCALATED_LOOKUP_BATCH_SIZE);
    for (const batch of batches) {
      expect(encodeURIComponent(batch).length).toBeLessThan(8000);
    }
    const ids = batches.join(",").match(/[0-9a-f-]{36}/g);
    expect(new Set(ids).size).toBe(1000);
  });

  it("asks nothing for an empty queue", () => {
    expect(escalatedLookupBatches([])).toEqual([]);
  });

  it("names posts and comments in their own columns", () => {
    expect(
      escalatedLookupBatches([
        { kind: "post", id: uuid(1) },
        { kind: "comment", id: uuid(2) },
      ]),
    ).toEqual([`target_post_id.in.(${uuid(1)}),target_comment_id.in.(${uuid(2)})`]);
  });

  it("drops an id that is not a uuid instead of splicing it into the filter", () => {
    expect(
      escalatedLookupBatches([
        { kind: "post", id: "x),action.eq.ban" },
        { kind: "post", id: uuid(3) },
      ]),
    ).toEqual([`target_post_id.in.(${uuid(3)})`]);
  });
});
