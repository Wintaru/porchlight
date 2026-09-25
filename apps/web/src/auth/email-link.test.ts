import { describe, expect, test } from "vitest";

import { isEmailLinkType } from "./email-link";

describe("isEmailLinkType", () => {
  test("accepts only the type the templates write", () => {
    expect(isEmailLinkType("email")).toBe(true);
    for (const other of ["recovery", "email_change", "magiclink", "signup", "", null]) {
      expect(isEmailLinkType(other)).toBe(false);
    }
  });
});
