import { expect, test } from "vitest";

import { parseHandleParam } from "./handle-param";

test("an @handle segment yields the handle, encoded or not", () => {
  expect(parseHandleParam("@theo")).toBe("theo");
  expect(parseHandleParam("%40theo")).toBe("theo");
  expect(parseHandleParam("@marisol-vega_2")).toBe("marisol-vega_2");
});

test("anything that is not an @handle in shape is undefined", () => {
  for (const segment of ["theo", "@", "@T", "@a", "@-x", "@x y", "@" + "a".repeat(31)]) {
    expect(parseHandleParam(segment), segment).toBeUndefined();
  }
});

test("a malformed percent sequence is undefined, not a thrown URIError", () => {
  for (const segment of ["%zz", "@theo%", "%E0%A4%A"]) {
    expect(parseHandleParam(segment), segment).toBeUndefined();
  }
});
