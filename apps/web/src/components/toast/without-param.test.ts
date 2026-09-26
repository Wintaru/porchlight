import { expect, test } from "vitest";

import { withoutParam } from "./without-param";

test("drops the one parameter and keeps the rest, the path, and the hash", () => {
  expect(
    withoutParam(
      "http://localhost:3000/p/hello?error=x&comment=visible#comments",
      "comment",
    ),
  ).toBe("http://localhost:3000/p/hello?error=x#comments");
});

test("leaves no bare question mark when the parameter was the only one", () => {
  expect(withoutParam("http://localhost:3000/admin?done=saved", "done")).toBe(
    "http://localhost:3000/admin",
  );
});

test("an address without the parameter comes back unchanged", () => {
  expect(withoutParam("http://localhost:3000/settings#voice", "voiceSaved")).toBe(
    "http://localhost:3000/settings#voice",
  );
});
