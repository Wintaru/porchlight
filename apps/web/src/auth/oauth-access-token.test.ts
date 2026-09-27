import { describe, expect, test } from "vitest";

import { oauthIdentityOf } from "./oauth-access-token";

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
