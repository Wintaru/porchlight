import { expect, test } from "vitest";

import { SITE_URL } from "./site";

test("the local default site URL has no trailing slash", () => {
  expect(SITE_URL).toBe("http://localhost:3000");
});
