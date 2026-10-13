import { expect, test } from "vitest";

import { listPageHref, pageCursorParam, parsePageCursor } from "./page-cursor";

const ID = "3f2b8c1e-7a4d-4e9b-9c0a-1d2e3f4a5b6c";

test("a cursor survives the URL with its microseconds", () => {
  const cursor = { publishedAt: "2026-10-01T12:00:00.123456+00:00", id: ID };
  const href = listPageHref("/", {}, cursor);
  const raw = new URL(href, "http://x").searchParams.get("before");
  expect(parsePageCursor(raw)).toEqual(cursor);
  expect(pageCursorParam(cursor)).toBe(`2026-10-01T12:00:00.123456+00:00_${ID}`);
});

test("anything that is not a cursor in shape is undefined", () => {
  for (const raw of [
    undefined,
    ["a", "b"],
    "",
    ID,
    `2026-10-01_${ID}`,
    `2026-10-01T12:00:00Z_not-an-id`,
    `2026-10-01T12:00:00Z_${ID}_extra`,
    `2026-02-30T12:00:00Z_${ID}`,
    `2026-13-01T12:00:00Z_${ID}`,
    `2026-10-01T24:00:00Z_${ID}`,
    `2026-10-01T12:00:00+99:00_${ID}`,
    `2026-10-01T12:00:00Z"),id.gt.(x_${ID}`,
  ]) {
    expect(parsePageCursor(raw), String(raw)).toBeUndefined();
  }
});

test("a list page keeps its own query beside the cursor", () => {
  expect(listPageHref("/", { feed: "following" }, undefined)).toBe("/?feed=following");
  expect(listPageHref("/t/making", {}, undefined)).toBe("/t/making");
  expect(
    listPageHref(
      "/",
      { feed: "following" },
      { publishedAt: "2026-10-01T12:00:00Z", id: ID },
    ),
  ).toBe(`/?feed=following&before=2026-10-01T12%3A00%3A00Z_${ID}`);
});
