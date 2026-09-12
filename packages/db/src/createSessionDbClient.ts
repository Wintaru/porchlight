import {
  type CookieMethodsServer,
  type CookieOptions,
  createServerClient,
} from "@supabase/ssr";

import type { Database } from "./database.types";
import type { DbClient } from "./createDbClient";

/** One cookie as the session store reads it. */
export interface SessionCookie {
  readonly name: string;
  readonly value: string;
}

/** One cookie as the session store writes it after a sign-in, refresh or sign-out. */
export interface SessionCookieToSet extends SessionCookie {
  readonly options: CookieOptions;
}

/**
 * How the session client reaches the request's cookie jar. The caller adapts its
 * framework (Next.js `cookies()`, a `NextRequest` and its response) to these two calls.
 * `setAll` receives the cache headers that must ride along with a cookie write, so a
 * proxy never caches one member's tokens for another.
 */
export interface SessionCookieStore {
  readonly getAll: () => readonly SessionCookie[];
  readonly setAll: (
    cookies: readonly SessionCookieToSet[],
    headers: Readonly<Record<string, string>>,
  ) => void;
}

/**
 * Builds the Supabase client that carries a member's session in cookies (SPEC.md §4).
 * Always the anon key: this client acts as the signed-in member under RLS, never as the
 * service role. Build one per request and call `auth.getClaims()` before any response
 * body is written, or a token refresh has nowhere to land.
 */
export function createSessionDbClient(
  url: string,
  anonKey: string,
  store: SessionCookieStore,
): DbClient {
  const cookies: CookieMethodsServer = {
    getAll: () => [...store.getAll()],
    setAll: (cookiesToSet, headers) => {
      store.setAll(cookiesToSet, headers);
    },
  };
  return createServerClient<Database>(url, anonKey, { cookies });
}
