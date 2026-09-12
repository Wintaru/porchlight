import { cache } from "react";

import { createSessionClient } from "./session-client";
import { type SessionUser, toSessionUser } from "./session-user";

// Who holds the session cookie, verified, or undefined for a visitor. `getClaims` checks
// the token's signature: on the local stack (symmetric key) that is one round trip to
// Auth, on a hosted project it is a local check against the project's public keys.
// React's `cache` dedupes the call within one request.
export const getCurrentUser = cache(async (): Promise<SessionUser | undefined> => {
  const client = await createSessionClient();
  const { data, error } = await client.auth.getClaims();
  if (error !== null || data === null) {
    return undefined;
  }
  return toSessionUser(data.claims.sub, data.claims);
});
