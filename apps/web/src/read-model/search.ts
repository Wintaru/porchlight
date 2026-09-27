import type { DbClient } from "@porchlight/db";

// One hit from `public.search_site` (#23): a post, or a comment with the post it is on.
// The function runs under the caller's RLS, keeps to public published posts, and
// leaves out members the caller muted or blocked.
export type SearchHit =
  | {
      readonly kind: "post";
      readonly postId: string;
      readonly title: string;
      readonly href: string;
      readonly snippet: string;
      readonly publishedAt: string;
    }
  | {
      readonly kind: "comment";
      readonly postId: string;
      readonly commentId: string;
      readonly title: string;
      readonly href: string;
      readonly snippet: string;
      readonly publishedAt: string;
    };

export const SEARCH_LIMIT = 20;

export async function searchSite(
  db: DbClient,
  query: string,
): Promise<readonly SearchHit[]> {
  const { data, error } = await db.rpc("search_site", {
    p_query: query,
    p_limit: SEARCH_LIMIT,
  });
  if (error) {
    throw new Error(`search: ${error.message}`);
  }
  return data.flatMap((row) => {
    const hit = toHit(row);
    return hit === undefined ? [] : [hit];
  });
}

// The generated types call every returned column non-null; a set-returning function's
// columns are not, so each nullable one is checked here. An anonymous post has no
// author handle and lives at `/p/slug` (D11).
interface SearchRow {
  readonly kind: string;
  readonly post_id: string;
  readonly comment_id: string | null;
  readonly title: string;
  readonly slug: string;
  readonly author_handle: string | null;
  readonly snippet: string;
  readonly published_at: string;
}

function toHit(row: SearchRow): SearchHit | undefined {
  const postHref =
    row.author_handle === null ? `/p/${row.slug}` : `/@${row.author_handle}/${row.slug}`;
  const common = {
    postId: row.post_id,
    title: row.title,
    snippet: row.snippet,
    publishedAt: row.published_at,
  };
  if (row.kind === "post") {
    return { kind: "post", href: postHref, ...common };
  }
  if (row.kind === "comment" && row.comment_id !== null) {
    return {
      kind: "comment",
      commentId: row.comment_id,
      href: `${postHref}#comment-${row.comment_id}`,
      ...common,
    };
  }
  return undefined;
}
