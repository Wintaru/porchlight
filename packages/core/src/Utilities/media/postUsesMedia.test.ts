import { describe, expect, test } from "vitest";

import { postUsesMedia } from "./postUsesMedia";

const ID = "3f1c2a9e-7b1d-4c55-9a1e-2f7d8c6b5a40";

describe("postUsesMedia", () => {
  test("the cover counts", () => {
    expect(postUsesMedia({ bodyMd: "", coverMediaId: ID }, ID)).toBe(true);
  });

  test("an address anywhere in the body counts", () => {
    const bodyMd = `Look.\n\n![porch](https://x.test/public-media/${ID}.jpg)`;
    expect(postUsesMedia({ bodyMd, coverMediaId: null }, ID)).toBe(true);
  });

  test("a post that shows neither does not use it", () => {
    expect(postUsesMedia({ bodyMd: "Nothing here.", coverMediaId: null }, ID)).toBe(
      false,
    );
  });
});
