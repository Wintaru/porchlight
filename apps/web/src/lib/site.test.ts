import { expect, test } from "vitest";

import { SITE_NAME } from "./site";

test("the site name is Porchlight", () => {
  expect(SITE_NAME).toBe("Porchlight");
});
