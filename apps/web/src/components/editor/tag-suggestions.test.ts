import { describe, expect, test } from "vitest";

import { suggestTags, TAG_SUGGESTION_LIMIT } from "./tag-suggestions";

const KNOWN = ["Woodworking", "Hiking", "Home repair", "Bread", "Shoe hacks"];

describe("suggestTags", () => {
  test("offers nothing for an empty box", () => {
    expect(suggestTags(KNOWN, "  ", [])).toEqual([]);
  });

  test("puts names that start with the text before names that contain it", () => {
    expect(suggestTags(KNOWN, "ho", [])).toEqual(["Home repair", "Shoe hacks"]);
  });

  test("ignores case", () => {
    expect(suggestTags(KNOWN, "HIK", [])).toEqual(["Hiking"]);
  });

  test("leaves out a tag the post already has", () => {
    expect(suggestTags(KNOWN, "h", ["hiking"])).toEqual(["Home repair", "Shoe hacks"]);
  });

  test("stops at the limit", () => {
    const many = Array.from({ length: 20 }, (_, index) => `tag ${String(index)}`);
    expect(suggestTags(many, "tag", [])).toHaveLength(TAG_SUGGESTION_LIMIT);
  });
});
