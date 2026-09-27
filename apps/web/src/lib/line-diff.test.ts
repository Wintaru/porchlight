import { expect, test } from "vitest";

import { foldUnchanged, lineDiff } from "./line-diff";

test("marks the lines a change added and removed, and keeps the rest", () => {
  expect(lineDiff("one\ntwo\nthree", "one\n2\nthree\nfour")).toEqual([
    { kind: "same", text: "one" },
    { kind: "removed", text: "two" },
    { kind: "added", text: "2" },
    { kind: "same", text: "three" },
    { kind: "added", text: "four" },
  ]);
});

test("the same text is all kept, and empty to text is all added", () => {
  expect(lineDiff("a\nb", "a\nb").every((line) => line.kind === "same")).toBe(true);
  expect(lineDiff("", "a")).toEqual([
    { kind: "removed", text: "" },
    { kind: "added", text: "a" },
  ]);
});

test("folds long unchanged runs down to the lines around a change", () => {
  const before = ["1", "2", "3", "4", "5", "6", "7", "8"].join("\n");
  const after = ["1", "2", "3", "4", "five", "6", "7", "8"].join("\n");
  expect(foldUnchanged(lineDiff(before, after), 1)).toEqual([
    { kind: "fold", count: 3 },
    { kind: "same", text: "4" },
    { kind: "removed", text: "5" },
    { kind: "added", text: "five" },
    { kind: "same", text: "6" },
    { kind: "fold", count: 2 },
  ]);
});
