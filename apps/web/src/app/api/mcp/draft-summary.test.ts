import { describe, expect, test } from "vitest";

import { draftSummary } from "./draft-summary";

describe("draftSummary", () => {
  test("an empty or blank summary is none", () => {
    expect(draftSummary("")).toBeNull();
    expect(draftSummary("   ")).toBeNull();
    expect(draftSummary(null)).toBeNull();
  });

  test("a summary is trimmed", () => {
    expect(draftSummary("  A line.  ")).toBe("A line.");
  });
});
