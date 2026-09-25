import { describe, expect, test } from "vitest";

import { parseClientAddress } from "./parseClientAddress";

describe("parseClientAddress (#61)", () => {
  test.each([
    ["203.0.113.9", { ip: "203.0.113.9", port: null }],
    ["203.0.113.9:51234", { ip: "203.0.113.9", port: 51234 }],
    ["2001:db8::1", { ip: "2001:db8::1", port: null }],
    ["[2001:db8::1]:443", { ip: "2001:db8::1", port: 443 }],
    ["[::1]", { ip: "::1", port: null }],
    [" 203.0.113.9 ", { ip: "203.0.113.9", port: null }],
  ])("%s is an address", (raw, expected) => {
    expect(parseClientAddress(raw)).toEqual(expected);
  });

  test.each([
    "unknown",
    "",
    "999.1.1.1",
    "1.2.3",
    "not:an:address:zz",
    "[nope]:80",
    "a b",
  ])("%j is not an address", (raw) => {
    expect(parseClientAddress(raw)).toEqual({ ip: null, port: null });
  });

  test("a port out of range is dropped, the address kept", () => {
    expect(parseClientAddress("203.0.113.9:70000")).toEqual({
      ip: "203.0.113.9",
      port: null,
    });
  });
});
