import { NextResponse, type NextRequest } from "next/server";

import { createProxySessionClient } from "./session-client";

// Runs in the proxy on every page request. Reading the claims makes the client refresh an
// expired access token and write the new cookies onto the response, so Server Components
// (which cannot write cookies) always see a live session.
export async function refreshSession(request: NextRequest): Promise<NextResponse> {
  const response = NextResponse.next({ request });
  const client = createProxySessionClient(request, response);
  await client.auth.getClaims();
  return response;
}
