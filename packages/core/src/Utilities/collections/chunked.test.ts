import { expect, test } from "vitest";

import { chunked } from "./chunked";

test("chunked splits into runs of at most the size, in order", () => {
  expect(chunked([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  expect(chunked([], 3)).toEqual([]);
});
