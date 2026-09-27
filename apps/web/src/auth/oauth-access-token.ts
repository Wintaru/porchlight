import { createDbClient, type DbClient } from "@porchlight/db";

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

// One client for the process, so `getClaims` keeps the project's signing keys cached
// between requests instead of fetching them for every tool call.
let verifier: DbClient | undefined;

function verifierClient(): DbClient {
  if (verifier === undefined) {
    const { url, anonKey } = readSupabasePublicEnv();
    verifier = createDbClient(url, anonKey);
  }
  return verifier;
}

// Checks the token's signature and expiry. With asymmetric signing keys (every hosted
// project, and the local stack) this is a local check against the project's public
// keys; with a symmetric key it is one round trip to Auth. Signature and expiry only:
// whether this member still grants this client anything is the Manager's question.
export async function verifyOAuthAccessToken(raw: string): Promise<OAuthTokenVerdict> {
  let result: Awaited<ReturnType<DbClient["auth"]["getClaims"]>>;
  try {
    result = await verifierClient().auth.getClaims(raw);
  } catch (error: unknown) {
    // getClaims turns only Auth's own errors into `error`. A token shaped to fail the
    // key import or name an algorithm it does not know throws instead, and anyone can
    // send one: it is a bad token, not a server fault.
    console.warn(
      "oauth token rejected by the verifier",
      error instanceof Error ? error.name : typeof error,
    );
    return { kind: "invalid" };
  }
  const { data, error } = result;
  if (error !== null) {
    // Auth or its key endpoint failing is not a bad token: saying "invalid" would make
    // the client throw away a good grant and send the member through consent again.
    if (error.name === "AuthRetryableFetchError" || (error.status ?? 0) >= 500) {
      return { kind: "unavailable", reason: error.message };
    }
    return { kind: "invalid" };
  }
  if (data === null) {
    return { kind: "invalid" };
  }
  const identity = oauthIdentityOf(data.claims);
  return identity === undefined ? { kind: "invalid" } : { kind: "valid", identity };
}
