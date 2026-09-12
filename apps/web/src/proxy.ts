import { NextResponse, type NextRequest } from "next/server";

import { refreshSession } from "@/auth/refresh-session";
import { parseHandleParam } from "@/lib/handle-param";
import { loadAuthorStatus } from "@/read-model/author";

// Keeps the session cookie fresh on every page and route request (SPEC.md §4). No
// redirects here: a page that needs a member checks the actor itself.
//
// One status code a page cannot send: 410 Gone for an erased author (D11). A page can
// only render, redirect or 404, so the proxy reads the author's status under RLS
// (erased rows are readable, and blank) and answers before the page runs.
export async function proxy(request: NextRequest): Promise<NextResponse> {
  const { response, client } = await refreshSession(request);
  const handle = authorHandleOf(request.nextUrl.pathname);
  if (handle === undefined) {
    return response;
  }
  const status = await loadAuthorStatus(client, handle);
  if (status === "erased") {
    return new NextResponse("This author has erased their account.", {
      status: 410,
      headers: { "content-type": "text/plain; charset=utf-8", "x-robots-tag": "noindex" },
    });
  }
  return response;
}

// `/@handle` and `/@handle/anything`, or undefined for every other path.
function authorHandleOf(pathname: string): string | undefined {
  const [, first] = pathname.split("/");
  return first === undefined ? undefined : parseHandleParam(first);
}

export const config = {
  // Everything except Next's own assets and static files with an extension.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.[a-zA-Z0-9]+$).*)"],
};
