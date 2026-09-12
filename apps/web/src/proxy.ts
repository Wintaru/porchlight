import { NextResponse, type NextRequest } from "next/server";

import { refreshSession } from "@/auth/refresh-session";
import { parseHandleParam } from "@/lib/handle-param";
import { loadAuthorStatus } from "@/read-model/author";
import { loadPostClaimStatus } from "@/read-model/post-page";

// Keeps the session cookie fresh on every page and route request (SPEC.md §4). No
// redirects here: a page that needs a member checks the actor itself.
//
// One status code a page cannot send: 410 Gone for an erased author (D11). A page can
// only render, redirect or 404, so the proxy reads the author's status under RLS
// (erased rows are readable, and blank) and answers before the page runs.
export async function proxy(request: NextRequest): Promise<NextResponse> {
  const { response, client } = await refreshSession(request);
  const anonymousSlug = anonymousPostSlugOf(request.nextUrl.pathname);
  if (anonymousSlug !== undefined) {
    // Read under the requester's own session (D11): once claimed, only the claiming
    // member's `posts_own_read` grant sees the row before it is published, which is
    // exactly the visitor this 301 matters for — the one who just claimed it. Anyone
    // else's session sees nothing here and falls through to the page, same as if this
    // check were not run at all. A handful of columns, not the page's full projection:
    // every still-anonymous view of this path — the common case — pays for this query.
    const claimed = await loadPostClaimStatus(client, anonymousSlug);
    if (claimed !== undefined) {
      return NextResponse.redirect(
        new URL(`/@${claimed.authorHandle}/${claimed.slug}`, request.url),
        301,
      );
    }
    return response;
  }
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

// `/p/<slug>` (D11), never `/p/new` — that path is the anonymous write form, not a
// post.
function anonymousPostSlugOf(pathname: string): string | undefined {
  const [, first, second, third] = pathname.split("/");
  if (first !== "p" || second === undefined || second === "new" || third !== undefined) {
    return undefined;
  }
  return second;
}

export const config = {
  // Everything except Next's own assets and static files with an extension.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.[a-zA-Z0-9]+$).*)"],
};
