import type { NextRequest, NextResponse } from "next/server";

import { refreshSession } from "@/auth/refresh-session";

// Keeps the session cookie fresh on every page and route request (SPEC.md §4). No
// redirects here: a page that needs a member checks the actor itself.
export function proxy(request: NextRequest): Promise<NextResponse> {
  return refreshSession(request);
}

export const config = {
  // Everything except Next's own assets and static files with an extension.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.[a-zA-Z0-9]+$).*)"],
};
