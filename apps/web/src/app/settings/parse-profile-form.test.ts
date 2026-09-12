import { describe, expect, test } from "vitest";

import {
  BIO_MAX_LENGTH,
  DISPLAY_NAME_MAX_LENGTH,
  parseProfileForm,
} from "./parse-profile-form";

function form(fields: Readonly<Record<string, string>>): FormData {
  const data = new FormData();
  for (const [name, value] of Object.entries(fields)) {
    data.set(name, value);
  }
  return data;
}

describe("parseProfileForm", () => {
  test("trims and passes the three fields through", () => {
    expect(
      parseProfileForm(form({ handle: " june ", displayName: " June ", bio: " Hi " })),
    ).toEqual({
      ok: true,
      changes: { handle: "june", displayName: "June", bio: "Hi" },
    });
  });

  test("an empty display name or bio clears the field", () => {
    expect(
      parseProfileForm(form({ handle: "june", displayName: "", bio: "  " })),
    ).toEqual({
      ok: true,
      changes: { handle: "june", displayName: null, bio: null },
    });
  });

  test("a missing field reads as empty", () => {
    expect(parseProfileForm(form({}))).toMatchObject({
      ok: true,
      changes: { handle: "" },
    });
  });

  test("length caps", () => {
    expect(
      parseProfileForm(
        form({ handle: "june", displayName: "x".repeat(DISPLAY_NAME_MAX_LENGTH + 1) }),
      ),
    ).toEqual({ ok: false, error: "display-name-length" });
    expect(
      parseProfileForm(form({ handle: "june", bio: "x".repeat(BIO_MAX_LENGTH + 1) })),
    ).toEqual({
      ok: false,
      error: "bio-length",
    });
  });
});
