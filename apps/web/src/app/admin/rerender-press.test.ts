import { describe, expect, test } from "vitest";

import {
  parseRerenderCursor,
  RERENDER_START,
  rerenderPress,
  type RerenderTable,
  type TableRun,
} from "./rerender-press";

const ROW = "00000000-0000-4000-8000-000000000a01";

// A table of `ids` in order. Each run reads up to its budget after the cursor, like the
// core's handlers. `stale` ids change; `saved` ids are skipped.
function table(
  ids: readonly string[],
  calls: string[],
  name: RerenderTable,
  saved: readonly string[] = [],
): TableRun {
  return (afterId, maxBodies) => {
    calls.push(`${name}:${afterId ?? "start"}:${String(maxBodies)}`);
    const from = afterId === null ? 0 : ids.indexOf(afterId) + 1;
    const read = ids.slice(from, from + maxBodies);
    const last = read.at(-1);
    const full = read.length === maxBodies && last !== undefined;
    const skipped = read.filter((id) => saved.includes(id)).length;
    return Promise.resolve({
      checked: read.length,
      changed: read.length - skipped,
      skipped,
      resumeAfterId: full ? last : null,
    });
  };
}

function ids(prefix: string, count: number): string[] {
  return Array.from({ length: count }, (_, i) => `${prefix}${String(i)}`);
}

describe("rerenderPress (#98)", () => {
  test("a small site is done in one press, posts then comments", async () => {
    const calls: string[] = [];
    const outcome = await rerenderPress(RERENDER_START, 10, {
      posts: table(ids("p", 3), calls, "posts", ["p1"]),
      comments: table(ids("c", 2), calls, "comments"),
    });
    expect(outcome).toEqual({ kind: "done", changed: 4, skipped: 1 });
    // The comments get what the posts left of the budget.
    expect(calls).toEqual(["posts:start:10", "comments:start:7"]);
  });

  test("a press stopped part way resumes where it stopped, until done", async () => {
    const calls: string[] = [];
    const runs = {
      posts: table(ids("p", 5), calls, "posts"),
      comments: table(ids("c", 3), calls, "comments"),
    };

    const first = await rerenderPress(RERENDER_START, 3, runs);
    expect(first).toEqual({
      kind: "stopped",
      changed: 3,
      skipped: 0,
      next: { table: "posts", afterId: "p2" },
    });
    if (first.kind !== "stopped") {
      throw new Error("expected a stop");
    }
    const second = await rerenderPress(first.next, 3, runs);
    expect(second).toEqual({
      kind: "stopped",
      changed: 3,
      skipped: 0,
      next: { table: "comments", afterId: "c0" },
    });
    if (second.kind !== "stopped") {
      throw new Error("expected a stop");
    }
    const third = await rerenderPress(second.next, 3, runs);
    expect(third).toEqual({ kind: "done", changed: 2, skipped: 0 });
    expect(calls).toEqual([
      "posts:start:3",
      "posts:p2:3",
      "comments:start:1",
      "comments:c0:3",
    ]);
  });

  test("a budget used up exactly at the end of the posts starts the comments next", async () => {
    const calls: string[] = [];
    // A posts run that reads its whole budget but reports the table done.
    const outcome = await rerenderPress(RERENDER_START, 2, {
      posts: () =>
        Promise.resolve({ checked: 2, changed: 2, skipped: 0, resumeAfterId: null }),
      comments: table(ids("c", 1), calls, "comments"),
    });
    expect(outcome).toEqual({
      kind: "stopped",
      changed: 2,
      skipped: 0,
      next: { table: "comments", afterId: null },
    });
    expect(calls).toEqual([]);
  });

  test("a failed table stops the press", async () => {
    const calls: string[] = [];
    const outcome = await rerenderPress(RERENDER_START, 10, {
      posts: () => Promise.resolve("failed"),
      comments: table(ids("c", 1), calls, "comments"),
    });
    expect(outcome).toEqual({ kind: "failed" });
    expect(calls).toEqual([]);
  });
});

describe("parseRerenderCursor", () => {
  test("nothing sent starts from the first post", () => {
    expect(parseRerenderCursor(null, null)).toEqual(RERENDER_START);
    expect(parseRerenderCursor(undefined, "")).toEqual(RERENDER_START);
  });

  test("a known table, with or without a row id", () => {
    expect(parseRerenderCursor("comments", null)).toEqual({
      table: "comments",
      afterId: null,
    });
    expect(parseRerenderCursor("posts", ROW)).toEqual({ table: "posts", afterId: ROW });
  });

  test("an unknown table or a row that is not an id is refused", () => {
    expect(parseRerenderCursor("profiles", null)).toBeUndefined();
    expect(parseRerenderCursor("posts", "' or 1=1")).toBeUndefined();
    expect(parseRerenderCursor(null, ROW)).toBeUndefined();
  });
});
