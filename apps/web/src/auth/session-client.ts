import {
  createDbClient,
  createSessionDbClient,
  type DbClient,
  type SessionCookieStore,
} from "@porchlight/db";
import { cookies } from "next/headers";
import type { NextRequest, NextResponse } from "next/server";

import { readSupabasePublicEnv } from "./supabase-env";

// The Supabase client that acts as the signed-in member, for Server Components, Server
// Functions and Route Handlers. Reads the request's cookies through `next/headers`.
export async function createSessionClient(): Promise<DbClient> {
  const jar = await cookies();
  const store: SessionCookieStore = {
    getAll: () => jar.getAll(),
    setAll: (toSet) => {
      try {
        for (const { name, value, options } of toSet) {
          jar.set(name, value, options);
        }
      } catch {
        // A Server Component cannot write cookies. That is expected: the proxy refreshes
        // the session on every request, so a refresh that lands here is written there on
        // the next one. A Server Function or Route Handler never reaches this catch.
      }
    },
  };
  const { url, anonKey } = readSupabasePublicEnv();
  return createSessionDbClient(url, anonKey, store);
}

// The same client for the proxy, where cookies come off the NextRequest and go onto the
// NextResponse it returns. The cache headers ride along so a CDN never stores a response
// that carries one member's tokens.
export function createProxySessionClient(
  request: NextRequest,
  response: NextResponse,
): DbClient {
  const store: SessionCookieStore = {
    getAll: () => request.cookies.getAll(),
    setAll: (toSet, headers) => {
      for (const { name, value, options } of toSet) {
        response.cookies.set(name, value, options);
      }
      for (const [name, value] of Object.entries(headers)) {
        response.headers.set(name, value);
      }
    },
  };
  const { url, anonKey } = readSupabasePublicEnv();
  return createSessionDbClient(url, anonKey, store);
}

// A client that holds no session and reads or writes no cookies: for Auth calls that run
// after the response has gone (`after()`, #84), where no cookie can reach the browser,
// and for a public read whose answer a CDN may cache (D33).
export function createCookielessAuthClient(): DbClient {
  const { url, anonKey } = readSupabasePublicEnv();
  return createDbClient(url, anonKey);
}
