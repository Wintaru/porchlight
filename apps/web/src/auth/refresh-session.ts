import { type DbClient } from "@porchlight/db";
import { NextResponse, type NextRequest } from "next/server";

import { createProxySessionClient } from "./session-client";

export interface RefreshedSession {
  readonly response: NextResponse;
  // The same session the response's cookies now carry, so the proxy can make one more
  // read as this member without building a second client.
  readonly client: DbClient;
}

// Runs in the proxy on every page request. Reading the claims makes the client refresh an
// expired access token and write the new cookies onto the response, so Server Components
// (which cannot write cookies) always see a live session.
export async function refreshSession(request: NextRequest): Promise<RefreshedSession> {
  const response = NextResponse.next({ request });
  const client = createProxySessionClient(request, response);
  await client.auth.getClaims();
  return { response, client };
}
