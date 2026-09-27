import { describe, expect, test } from "vitest";

import { parseScopeChoices } from "./agent-scopes";

function form(scopes: readonly string[]): FormData {
  const data = new FormData();
  for (const scope of scopes) {
    data.append("scopes", scope);
  }
  return data;
}

describe("parseScopeChoices", () => {
  test("adds the draft floor to what was ticked, once", () => {
    expect(parseScopeChoices(form([]))).toEqual(["posts:draft"]);
    expect(parseScopeChoices(form(["media:upload", "posts:draft"]))).toEqual([
      "posts:draft",
      "media:upload",
    ]);
  });

  test("refuses the whole form when one value is not a scope", () => {
    expect(parseScopeChoices(form(["posts:publish", "admin:all"]))).toBeUndefined();
  });
});
