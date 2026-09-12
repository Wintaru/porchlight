import { describe, expect, test } from "vitest";

import { safeNextPath } from "./safe-next-path";

describe("safeNextPath", () => {
  test("keeps a same-site path", () => {
    expect(safeNextPath("/settings")).toBe("/settings");
    expect(safeNextPath("/@june/planter?x=1#c")).toBe("/@june/planter?x=1#c");
  });

  test("falls back to the home page for anything that could leave the site", () => {
    for (const bad of [
      undefined,
      null,
      "",
      "https://evil.example",
      "//evil.example",
      "/\\evil.example",
      "settings",
      // The URL parser drops tabs and newlines, so these would become `//evil.example`.
      "/\t//evil.example",
      "/\n//evil.example",
      "/\r//evil.example",
      "/ //evil.example",
    ]) {
      expect(safeNextPath(bad)).toBe("/");
    }
  });
});
