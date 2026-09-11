import { expect, test } from "vitest";

// Proves the package resolves and Vitest runs here. Issue #3 replaces this with real tests.
test("the package entry resolves", async () => {
  const entry: object = await import("../src/index.js");
  expect(entry).toBeDefined();
});
