import { describe, expect, test } from "vitest";

import { generateAgentToken } from "./generateAgentToken";
import { hashAgentToken } from "./hashAgentToken";

describe("generateAgentToken", () => {
  test("is plt_ plus 43 base64url characters", () => {
    expect(generateAgentToken()).toMatch(/^plt_[A-Za-z0-9_-]{43}$/);
  });

  test("differs every time", () => {
    expect(generateAgentToken()).not.toBe(generateAgentToken());
  });
});

describe("hashAgentToken", () => {
  test("is the lowercase hex sha256 the column checks", async () => {
    expect(await hashAgentToken("plt_x")).toMatch(/^[0-9a-f]{64}$/);
    expect(await hashAgentToken("plt_x")).toBe(await hashAgentToken("plt_x"));
    expect(await hashAgentToken("plt_x")).not.toBe(await hashAgentToken("plt_y"));
  });
});
