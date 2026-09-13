import { createSessionClient } from "@/auth/session-client";
import { parseHandleParam } from "@/lib/handle-param";
import { rssItemFor } from "@/lib/rss-item";
import { renderRss, rssResponse } from "@/lib/rss";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { loadAuthor, loadAuthorPosts } from "@/read-model/author";

interface RouteParams {
  readonly params: Promise<{ readonly handle: string }>;
}

// One author's feed, /@handle/feed.xml (SPEC.md §9, D21): how a friend follows one
// blog without an account. Same 404 rule as `/@handle` itself — a handle Next.js
// cannot parse, or a profile the browser roles cannot see as active, is not found.
export async function GET(_request: Request, { params }: RouteParams): Promise<Response> {
  const handle = parseHandleParam((await params).handle);
  if (handle === undefined) {
    return notFound();
  }
  const db = await createSessionClient();
  const author = await loadAuthor(db, handle);
  if (author?.status !== "active") {
    return notFound();
  }
  const posts = await loadAuthorPosts(db, author.id);
  return rssResponse(
    renderRss({
      title: `${author.display_name ?? `@${author.handle}`} · ${SITE_NAME}`,
      link: `${SITE_URL}/@${author.handle}`,
      description: author.bio ?? `@${author.handle} on ${SITE_NAME}`,
      items: posts.map(rssItemFor),
    }),
  );
}

function notFound(): Response {
  return new Response("Not found.", { status: 404 });
}
