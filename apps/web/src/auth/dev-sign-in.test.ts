import { describe, expect, test } from "vitest";

import { isDevSignInEnabled } from "./dev-sign-in";

describe("isDevSignInEnabled", () => {
  test("needs the flag on", () => {
    expect(isDevSignInEnabled({ NODE_ENV: "development" })).toBe(false);
    expect(isDevSignInEnabled({ NODE_ENV: "development", AUTH_DEV_SIGN_IN: "off" })).toBe(
      false,
    );
    expect(isDevSignInEnabled({ NODE_ENV: "development", AUTH_DEV_SIGN_IN: "on" })).toBe(
      true,
    );
    expect(isDevSignInEnabled({ NODE_ENV: "test", AUTH_DEV_SIGN_IN: "on" })).toBe(true);
  });

  test("a production build refuses even with the flag on", () => {
    expect(isDevSignInEnabled({ NODE_ENV: "production", AUTH_DEV_SIGN_IN: "on" })).toBe(
      false,
    );
  });
});
