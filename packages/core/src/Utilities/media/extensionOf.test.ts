import { describe, expect, test } from "vitest";

import { extensionOf } from "./extensionOf";

describe("extensionOf", () => {
  test("folds .jpg and .jpe into the catalog's jpeg", () => {
    expect(extensionOf("porch.JPG")).toBe("jpeg");
    expect(extensionOf("porch.jpe")).toBe("jpeg");
    expect(extensionOf("porch.jpeg")).toBe("jpeg");
  });

  test("keeps every other extension as it is, lowercased", () => {
    expect(extensionOf("notes.MD")).toBe("md");
    expect(extensionOf("plan.pdf")).toBe("pdf");
  });

  test("has no extension for a dotfile, a trailing dot, or no dot", () => {
    expect(extensionOf(".env")).toBeUndefined();
    expect(extensionOf("porch.")).toBeUndefined();
    expect(extensionOf("porch")).toBeUndefined();
  });
});
