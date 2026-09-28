import { createDbClient } from "@porchlight/db";
import { afterEach, describe, expect, test, vi } from "vitest";

import { createOAuthTokenVerifier, oauthIdentityOf } from "./oauth-access-token";
import { SigningKeyCache } from "./oauth-signing-keys";

// The claims Supabase Auth's OAuth server put in a real access token on the local stack
// (#79), trimmed to what matters here.
const OAUTH_CLAIMS = {
  sub: "00000000-0000-4000-8000-000000000003",
  role: "authenticated",
  aud: "authenticated",
  client_id: "6e1a791f-75b8-46fb-a738-7c53cb270412",
  scope: "email",
  session_id: "66dd036c-2da6-457d-9db2-97ee4c283a4f",
  iat: 1790544077,
};

describe("oauthIdentityOf", () => {
  test("reads the member and the client from an OAuth access token", () => {
    expect(oauthIdentityOf(OAUTH_CLAIMS)).toEqual({
      profileId: OAUTH_CLAIMS.sub,
      clientId: OAUTH_CLAIMS.client_id,
      issuedAt: new Date(1790544077 * 1000),
    });
  });

  test("a member's own session token has no client, so it is never an agent", () => {
    const session: Record<string, unknown> = { ...OAUTH_CLAIMS };
    delete session.client_id;
    expect(oauthIdentityOf(session)).toBeUndefined();
  });

  test("refuses the anon and service keys, and claims of the wrong shape", () => {
    for (const claims of [
      { ...OAUTH_CLAIMS, role: "anon" },
      { ...OAUTH_CLAIMS, role: "service_role" },
      { ...OAUTH_CLAIMS, client_id: "" },
      { ...OAUTH_CLAIMS, client_id: 7 },
      { ...OAUTH_CLAIMS, sub: undefined },
      { ...OAUTH_CLAIMS, iat: "yesterday" },
    ]) {
      expect(oauthIdentityOf(claims)).toBeUndefined();
    }
  });
});

// Issue #88: the door refuses a junk or forged token before any call to Auth. These
// tokens are signed for real with a key made here, and the verifier gets a real
// Supabase client whose every network call fails the test.
describe("the OAuth token verifier", () => {
  const KID = "11733204-968c-4aa9-82b4-b7ce48cc10de";
  const ES256 = { name: "ECDSA", namedCurve: "P-256" } as const;
  const SIGN = { name: "ECDSA", hash: "SHA-256" } as const;
  const HOUR_S = 3600;

  const base64url = (bytes: Uint8Array | string) =>
    Buffer.from(bytes).toString("base64url");

  async function keyPair() {
    return globalThis.crypto.subtle.generateKey(ES256, true, ["sign", "verify"]);
  }

  async function publicJwk(pair: CryptoKeyPair, kid = KID) {
    const jwk = await globalThis.crypto.subtle.exportKey("jwk", pair.publicKey);
    return { ...jwk, kid, alg: "ES256", use: "sig" };
  }

  async function sign(
    pair: CryptoKeyPair,
    claims: Record<string, unknown>,
    header: Record<string, unknown> = { alg: "ES256", kid: KID, typ: "JWT" },
  ) {
    const signingInput = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(claims))}`;
    const signature = await globalThis.crypto.subtle.sign(
      SIGN,
      pair.privateKey,
      new TextEncoder().encode(signingInput),
    );
    return `${signingInput}.${base64url(new Uint8Array(signature))}`;
  }

  const liveClaims = () => ({
    ...OAUTH_CLAIMS,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + HOUR_S,
  });

  function build(keySet: () => Promise<unknown>) {
    const network = vi.fn(() => Promise.reject(new Error("no network in this test")));
    vi.stubGlobal("fetch", network);
    const fetchKeySet = vi.fn(keySet);
    const client = createDbClient("http://127.0.0.1:9", "anon-key-for-tests");
    const verify = createOAuthTokenVerifier({
      keys: new SigningKeyCache(fetchKeySet),
      getClaims: (jwt, options) => client.auth.getClaims(jwt, options),
    });
    return { verify, fetchKeySet, network };
  }

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  test("a real OAuth token passes with one key set fetch and no call to Auth", async () => {
    const pair = await keyPair();
    const jwk = await publicJwk(pair);
    const { verify, fetchKeySet, network } = build(() =>
      Promise.resolve({ keys: [jwk] }),
    );

    const verdict = await verify(await sign(pair, liveClaims()));

    expect(verdict.kind).toBe("valid");
    expect(fetchKeySet).toHaveBeenCalledTimes(1);
    expect(network).not.toHaveBeenCalled();
  });

  test("a token with an unknown kid is refused with no network call", async () => {
    const pair = await keyPair();
    const jwk = await publicJwk(pair);
    const { verify, fetchKeySet, network } = build(() =>
      Promise.resolve({ keys: [jwk] }),
    );
    await verify(await sign(pair, liveClaims()));

    const verdict = await verify(
      await sign(pair, liveClaims(), { alg: "ES256", kid: "not-a-key-of-ours" }),
    );

    expect(verdict).toEqual({ kind: "invalid" });
    expect(fetchKeySet).toHaveBeenCalledTimes(1);
    expect(network).not.toHaveBeenCalled();
  });

  test("a token that names another algorithm, or no key id, never reaches a key lookup", async () => {
    const pair = await keyPair();
    const { verify, fetchKeySet, network } = build(() => Promise.resolve({ keys: [] }));
    const claims = liveClaims();

    for (const header of [
      { alg: "HS256", kid: KID },
      { alg: "PS256", kid: KID },
      { alg: "none", kid: KID },
      { alg: "ES256" },
      { alg: "ES256", kid: "" },
      { alg: "ES256", kid: 7 },
    ]) {
      expect(await verify(await sign(pair, claims, header))).toEqual({ kind: "invalid" });
    }
    for (const junk of [
      "",
      "abc",
      "a.b",
      "a.b.c.d",
      "%%%.e30.sig",
      `${base64url("[1]")}.e30.x`,
    ]) {
      expect(await verify(junk)).toEqual({ kind: "invalid" });
    }
    expect(fetchKeySet).not.toHaveBeenCalled();
    expect(network).not.toHaveBeenCalled();
  });

  test("refuses a forged signature, an expired token and a member's session token", async () => {
    const pair = await keyPair();
    const forger = await keyPair();
    const jwk = await publicJwk(pair);
    const { verify, network } = build(() => Promise.resolve({ keys: [jwk] }));
    const session: Record<string, unknown> = liveClaims();
    delete session.client_id;
    const expired = { ...liveClaims(), exp: Math.floor(Date.now() / 1000) - HOUR_S };

    expect(await verify(await sign(forger, liveClaims()))).toEqual({ kind: "invalid" });
    expect(await verify(await sign(pair, expired))).toEqual({ kind: "invalid" });
    expect(await verify(await sign(pair, session))).toEqual({ kind: "invalid" });
    expect(network).not.toHaveBeenCalled();
  });

  test("answers unavailable, not invalid, when the key set cannot be fetched", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const pair = await keyPair();
    const { verify } = build(() => Promise.reject(new Error("auth is down")));

    expect(await verify(await sign(pair, liveClaims()))).toEqual({
      kind: "unavailable",
      reason: "auth is down",
    });
  });
});
