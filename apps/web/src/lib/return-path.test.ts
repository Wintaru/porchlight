import { expect, test } from "vitest";

import { returnPathOf } from "./return-path";

function form(returnTo?: string): FormData {
  const data = new FormData();
  if (returnTo !== undefined) {
    data.set("returnTo", returnTo);
  }
  return data;
}

test("keeps a same-site path and drops its query and hash", () => {
  expect(returnPathOf(form("/@theo/cedar?comment=visible#comments"))).toBe(
    "/@theo/cedar",
  );
});

test("a missing or empty field gives the fallback", () => {
  expect(returnPathOf(form(), "/write/1")).toBe("/write/1");
  expect(returnPathOf(form(""), "/write/1")).toBe("/write/1");
  expect(returnPathOf(form())).toBe("/");
});

test("another origin is never a return path", () => {
  expect(returnPathOf(form("https://evil.example/x"))).toBe("/");
  expect(returnPathOf(form("//evil.example/x"))).toBe("/");
});
