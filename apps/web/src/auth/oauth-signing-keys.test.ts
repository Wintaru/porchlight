import { afterEach, describe, expect, test, vi } from "vitest";

import {
  es256KeysOf,
  SIGNING_KEYS_RETRY_MS,
  SIGNING_KEYS_TTL_MS,
  SigningKeyCache,
} from "./oauth-signing-keys";

// The public key the local stack served on 2026-09-28, the shape a hosted project serves.
const ES256_KEY = {
  alg: "ES256",
  crv: "P-256",
  ext: true,
  key_ops: ["verify"],
  kid: "b81269f1-21d8-4f2e-b719-c2240a840d90",
  kty: "EC",
  use: "sig",
  x: "M5Sjqn5zwC9Kl1zVfUUGvv9boQjCGd45G8sdopBExB4",
  y: "P6IXMvA2WYXSHSOMTBH2jsw_9rrzGy89FjPf6oOsIxQ",
};

function counting(answer: () => Promise<unknown>) {
  const fetchKeySet = vi.fn(answer);
  let clock = 1_000_000;
  const cache = new SigningKeyCache(fetchKeySet, () => clock);
  return {
    cache,
    fetchKeySet,
    advance: (ms: number) => {
      clock += ms;
    },
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("es256KeysOf", () => {
  test("keeps ES256 keys and leaves every other kind out", () => {
    const keys = es256KeysOf({
      keys: [
        ES256_KEY,
        { ...ES256_KEY, kid: "rsa", kty: "RSA", alg: "RS256" },
        { kty: "oct", kid: "hs", alg: "HS256", k: "c2VjcmV0" },
        { ...ES256_KEY, kid: undefined },
        { ...ES256_KEY, kid: "enc", use: "enc" },
        { ...ES256_KEY, kid: "p384", crv: "P-384" },
      ],
    });
    expect(keys?.map((key) => key.kid)).toEqual([ES256_KEY.kid]);
  });

  test("a document that is not a key set is undefined", () => {
    expect(es256KeysOf(null)).toBeUndefined();
    expect(es256KeysOf({ keys: "none" })).toBeUndefined();
    expect(es256KeysOf([ES256_KEY])).toBeUndefined();
  });
});

describe("SigningKeyCache", () => {
  test("fetches once for many lookups at the same moment, then not again within the TTL", async () => {
    const { cache, fetchKeySet, advance } = counting(() =>
      Promise.resolve({ keys: [ES256_KEY] }),
    );

    const found = await Promise.all([
      cache.keyFor(ES256_KEY.kid),
      cache.keyFor(ES256_KEY.kid),
      cache.keyFor("unknown"),
    ]);
    advance(SIGNING_KEYS_TTL_MS - 1);
    const unknown = await cache.keyFor("another-unknown");

    expect(found.map((lookup) => lookup.kind)).toEqual(["found", "found", "unknown"]);
    expect(unknown).toEqual({ kind: "unknown" });
    expect(fetchKeySet).toHaveBeenCalledTimes(1);
  });

  test("fetches again once the TTL is over, and sees a key Auth added", async () => {
    const added = { ...ES256_KEY, kid: "standby" };
    let served = [ES256_KEY];
    const { cache, fetchKeySet, advance } = counting(() =>
      Promise.resolve({ keys: served }),
    );

    expect(await cache.keyFor(added.kid)).toEqual({ kind: "unknown" });
    served = [ES256_KEY, added];
    advance(SIGNING_KEYS_TTL_MS);

    expect((await cache.keyFor(added.kid)).kind).toBe("found");
    expect(fetchKeySet).toHaveBeenCalledTimes(2);
  });

  test("with no keys yet, a failed fetch is unavailable, and the next try waits", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { cache, fetchKeySet, advance } = counting(() =>
      Promise.reject(new Error("auth is down")),
    );

    expect(await cache.keyFor(ES256_KEY.kid)).toEqual({
      kind: "unavailable",
      reason: "auth is down",
    });
    expect((await cache.keyFor(ES256_KEY.kid)).kind).toBe("unavailable");
    expect(fetchKeySet).toHaveBeenCalledTimes(1);

    advance(SIGNING_KEYS_RETRY_MS);
    await cache.keyFor(ES256_KEY.kid);
    expect(fetchKeySet).toHaveBeenCalledTimes(2);
  });

  test("a failed refresh keeps the keys it had", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    let down = false;
    const { cache, fetchKeySet, advance } = counting(() =>
      down
        ? Promise.reject(new Error("auth is down"))
        : Promise.resolve({ keys: [ES256_KEY] }),
    );

    await cache.keyFor(ES256_KEY.kid);
    down = true;
    advance(SIGNING_KEYS_TTL_MS);

    expect((await cache.keyFor(ES256_KEY.kid)).kind).toBe("found");
    expect((await cache.keyFor(ES256_KEY.kid)).kind).toBe("found");
    expect(fetchKeySet).toHaveBeenCalledTimes(2);
  });

  test("a key set of the wrong shape counts as a failed fetch", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { cache } = counting(() => Promise.resolve({ nope: true }));

    expect((await cache.keyFor(ES256_KEY.kid)).kind).toBe("unavailable");
  });
});
