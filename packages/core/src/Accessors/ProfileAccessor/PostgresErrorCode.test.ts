import { describe, expect, test } from "vitest";

import { isHandleTaken } from "./PostgresErrorCode";

describe("isHandleTaken", () => {
  test("only a unique violation on the handle constraint counts", () => {
    expect(
      isHandleTaken({
        code: "23505",
        message:
          'duplicate key value violates unique constraint "profiles_handle_unique"',
      }),
    ).toBe(true);
    // Two sign-ins racing on the same user id hit the primary key instead.
    expect(
      isHandleTaken({
        code: "23505",
        message: 'duplicate key value violates unique constraint "profiles_pkey"',
      }),
    ).toBe(false);
    expect(isHandleTaken({ code: "23514", message: "profiles_handle_unique" })).toBe(
      false,
    );
  });
});
