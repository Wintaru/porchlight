import { describe, expect, test } from "vitest";

import { base32Encode } from "./base32Encode";
import { formatClaimCode } from "./formatClaimCode";
import { generateAnonymousSecret } from "./generateAnonymousSecret";
import { normalizeClaimCode } from "./normalizeClaimCode";
import { sha256Hex } from "./sha256Hex";

describe("the anonymous secret", () => {
  test("is 52 base32 characters", () => {
    expect(generateAnonymousSecret()).toMatch(/^[A-Z2-7]{52}$/);
  });

  test("differs every time", () => {
    expect(generateAnonymousSecret()).not.toBe(generateAnonymousSecret());
  });

  test("survives the trip through the claim code", () => {
    const secret = generateAnonymousSecret();
    const code = formatClaimCode(secret);
    expect(code).toMatch(/^([A-Z2-7]{4}-){12}[A-Z2-7]{4}$/);
    expect(normalizeClaimCode(code)).toBe(secret);
    expect(normalizeClaimCode(` ${code.toLowerCase()} \n`)).toBe(secret);
  });
});

describe("normalizeClaimCode", () => {
  test("refuses text that could not be a secret", () => {
    expect(normalizeClaimCode("")).toBeUndefined();
    expect(normalizeClaimCode("hello world")).toBeUndefined();
    expect(normalizeClaimCode("ABCD-0189")).toBeUndefined();
  });
});

describe("base32Encode", () => {
  // RFC 4648 §10 test vectors, padding dropped.
  test("matches the RFC vectors", () => {
    const encode = (text: string) => base32Encode(new TextEncoder().encode(text));
    expect(encode("")).toBe("");
    expect(encode("f")).toBe("MY");
    expect(encode("fo")).toBe("MZXQ");
    expect(encode("foo")).toBe("MZXW6");
    expect(encode("foobar")).toBe("MZXW6YTBOI");
  });
});

describe("sha256Hex", () => {
  // The seed stores sha256('seed-anonymous-secret'); the cookie path must match it.
  test("matches Postgres digest(..., 'sha256')", async () => {
    expect(await sha256Hex("abc")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });
});
