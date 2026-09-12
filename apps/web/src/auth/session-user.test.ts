import { describe, expect, test } from "vitest";

import { toSessionUser } from "./session-user";

describe("toSessionUser", () => {
  test("reads Google's name and picture from the metadata", () => {
    expect(
      toSessionUser("u1", {
        email: "m@example.com",
        user_metadata: { full_name: " Marisol Vega ", picture: "https://x/p.png" },
      }),
    ).toEqual({
      id: "u1",
      email: "m@example.com",
      displayName: "Marisol Vega",
      avatarUrl: "https://x/p.png",
    });
  });

  test("a seeded password user has neither", () => {
    expect(toSessionUser("u1", { email: "june@porchlight.local" })).toEqual({
      id: "u1",
      email: "june@porchlight.local",
      displayName: null,
      avatarUrl: null,
    });
  });

  test("no email means no usable identity", () => {
    expect(toSessionUser("u1", {})).toBeUndefined();
    expect(toSessionUser("u1", { email: "" })).toBeUndefined();
  });
});
