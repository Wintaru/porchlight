import { createDbClient, type DbClient } from "@porchlight/db";

import { OAUTH_TOKEN_ALG, SigningKeyCache } from "./oauth-signing-keys";
import { readSupabasePublicEnv } from "./supabase-env";

// The identity an OAuth access token carries (D25): the member it was issued for and
// the OAuth client that holds it. Supabase Auth's OAuth server issues an ordinary
// member JWT plus a `client_id` claim. A member's own browser session has no
// `client_id`, and that absence is what keeps a session token from ever passing for an
// agent at the MCP door.
export interface OAuthIdentity {
  readonly profileId: string;
  readonly clientId: string;
  // When Auth issued the token: a token from before the member's current grant (one
  // revoked and approved again) must not come back to life.
  readonly issuedAt: Date;
}

export type OAuthTokenVerdict =
  | { readonly kind: "valid"; readonly identity: OAuthIdentity }
  | { readonly kind: "invalid" }
  | { readonly kind: "unavailable"; readonly reason: string };

const MS_PER_SECOND = 1000;

// Reads the claims from already-verified claims. `role` must be `authenticated`:
// an anon or service key is a JWT too, and neither is a member.
export function oauthIdentityOf(
  claims: Readonly<Record<string, unknown>>,
): OAuthIdentity | undefined {
  const { sub, client_id: clientId, role, iat } = claims;
  if (role !== "authenticated") {
    return undefined;
  }
  if (typeof sub !== "string" || sub === "") {
    return undefined;
  }
  if (typeof clientId !== "string" || clientId === "") {
    return undefined;
  }
  if (typeof iat !== "number" || !Number.isFinite(iat)) {
    return undefined;
  }
  return { profileId: sub, clientId, issuedAt: new Date(iat * MS_PER_SECOND) };
}

// The header fields the door checks before anything else (#88): the algorithm and the
// key id. Undefined when the token is not three parts or the header is not JSON.
export interface JwtHeader {
  readonly alg: unknown;
  readonly kid: unknown;
}

const JWT_PARTS = 3;

export function readJwtHeader(raw: string): JwtHeader | undefined {
  const parts = raw.split(".");
  const [header] = parts;
  if (parts.length !== JWT_PARTS || header === undefined || header === "") {
    return undefined;
  }
  try {
    const decoded: unknown = JSON.parse(
      Buffer.from(header, "base64url").toString("utf8"),
    );
    if (typeof decoded !== "object" || decoded === null || Array.isArray(decoded)) {
      return undefined;
    }
    const { alg, kid } = decoded as Readonly<Record<string, unknown>>;
    return { alg, kid };
  } catch {
    // Not JSON: a junk token, not a fault.
    return undefined;
  }
}

// What the verifier needs from outside: the signing keys, and `getClaims` for the
// signature and expiry. Injected so a test can count every network call.
export interface OAuthTokenVerifierDeps {
  readonly keys: SigningKeyCache;
  readonly getClaims: DbClient["auth"]["getClaims"];
}

// Checks the token's signature and expiry against Auth's public keys. Signature and
// expiry only: whether this member still grants this client anything is the Manager's
// question. Before any key is looked up, the header must name ES256 and a key id; the
// key must be in the cached set. So a junk or forged token costs no call to Auth (#88),
// and a symmetric (HS256) token, which `getClaims` would send to Auth, never gets that
// far.
export function createOAuthTokenVerifier(
  deps: OAuthTokenVerifierDeps,
): (raw: string) => Promise<OAuthTokenVerdict> {
  return async (raw) => {
    const header = readJwtHeader(raw);
    if (
      header?.alg !== OAUTH_TOKEN_ALG ||
      typeof header.kid !== "string" ||
      header.kid === ""
    ) {
      return { kind: "invalid" };
    }
    const lookup = await deps.keys.keyFor(header.kid);
    if (lookup.kind === "unavailable") {
      return { kind: "unavailable", reason: lookup.reason };
    }
    if (lookup.kind === "unknown") {
      return { kind: "invalid" };
    }
    let result: Awaited<ReturnType<DbClient["auth"]["getClaims"]>>;
    try {
      result = await deps.getClaims(raw, { jwks: { keys: [lookup.key] } });
    } catch (error: unknown) {
      // getClaims turns only Auth's own errors into `error`. A token shaped to fail the
      // key import throws instead, and anyone can send one: it is a bad token, not a
      // server fault.
      console.warn(
        "oauth token rejected by the verifier",
        error instanceof Error ? error.name : typeof error,
      );
      return { kind: "invalid" };
    }
    const { data, error } = result;
    if (error !== null || data === null) {
      // With the key supplied, getClaims makes no call, so an error here is the
      // token's: a bad signature or an expired token.
      return { kind: "invalid" };
    }
    const identity = oauthIdentityOf(data.claims);
    return identity === undefined ? { kind: "invalid" } : { kind: "valid", identity };
  };
}

const SIGNING_KEYS_FETCH_TIMEOUT_MS = 5000;

async function fetchSigningKeys(url: string): Promise<unknown> {
  const response = await fetch(`${url}/auth/v1/.well-known/jwks.json`, {
    cache: "no-store",
    signal: AbortSignal.timeout(SIGNING_KEYS_FETCH_TIMEOUT_MS),
  });
  if (!response.ok) {
    throw new Error(`the signing key set answered ${String(response.status)}`);
  }
  return response.json();
}

// One verifier for the process, so the key set stays cached between requests.
let verifier: ((raw: string) => Promise<OAuthTokenVerdict>) | undefined;

export function verifyOAuthAccessToken(raw: string): Promise<OAuthTokenVerdict> {
  if (verifier === undefined) {
    const { url, anonKey } = readSupabasePublicEnv();
    const client = createDbClient(url, anonKey);
    verifier = createOAuthTokenVerifier({
      keys: new SigningKeyCache(() => fetchSigningKeys(url)),
      getClaims: (jwt, options) => client.auth.getClaims(jwt, options),
    });
  }
  return verifier(raw);
}
