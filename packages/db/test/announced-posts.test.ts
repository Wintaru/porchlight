import type { Sql } from "postgres";
import { afterAll, beforeAll, describe, expect, test } from "vitest";

import { POST_SUMMARY_MAX_LENGTH } from "../../core/src/Common/PostSummary";
import { SupabaseLoadAnnouncedPostsHandler } from "../../core/src/Accessors/PostAccessor/Handlers/SupabaseLoadAnnouncedPostsHandler";
import { LoadAnnouncedPostsRequest } from "../../core/src/Accessors/PostAccessor/Requests/LoadAnnouncedPostsRequest";
import { AnnouncedPostsLoadedResponse } from "../../core/src/Accessors/PostAccessor/Responses/AnnouncedPostsLoadedResponse";
import { createDbClient } from "../src/index";
import { connect, LOCAL_STACK, SEED } from "./local-stack";

// #105: a digest lists a post with no summary by its first sentence, as the feed does.
// #117: a mature post lists no summary at all, since its text is blurred on the site.

let sql: Sql;
// A fixed prefix, so a run that died before its cleanup is cleaned by the next one.
const SLUG_PREFIX = "announced-posts-test-";
const announcedAt = new Date("2001-01-01T00:00:00Z");

async function removeTestPosts(): Promise<void> {
  await sql`delete from public.posts where slug like ${`${SLUG_PREFIX}%`}`;
}

beforeAll(async () => {
  sql = connect();
  await removeTestPosts();
  await sql`
    insert into public.posts
      (author_id, slug, title, body_md, summary, status, visibility, published_at, announced_at)
    values
      (${SEED.trustedMember}, ${`${SLUG_PREFIX}no-summary`}, 'No summary', 'The first line. The rest.',
       null, 'published', 'public', ${announcedAt}, ${announcedAt}),
      (${SEED.trustedMember}, ${`${SLUG_PREFIX}with-summary`}, 'With summary', 'Body first line.',
       'Written by hand.', 'published', 'public', ${announcedAt}, ${announcedAt}),
      (${SEED.trustedMember}, ${`${SLUG_PREFIX}mature`}, 'Mature', 'Blurred first line.',
       'Blurred summary.', 'published', 'public', ${announcedAt}, ${announcedAt})
  `;
  await sql`
    insert into public.post_tags (post_id, tag_id)
    select id, ${SEED.matureTag} from public.posts where slug = ${`${SLUG_PREFIX}mature`}
  `;
});

afterAll(async () => {
  await removeTestPosts();
  await sql.end();
});

describe("SupabaseLoadAnnouncedPostsHandler", () => {
  test("uses the summary, else the first sentence, and none for a mature post", async () => {
    const handler = new SupabaseLoadAnnouncedPostsHandler(
      createDbClient(LOCAL_STACK.apiUrl, LOCAL_STACK.serviceRoleKey),
    );
    const response = await handler.handle(
      new LoadAnnouncedPostsRequest(
        new Date(announcedAt.getTime() - 1000),
        announcedAt,
        SEED.trustedMember,
        10,
      ),
    );
    if (!(response instanceof AnnouncedPostsLoadedResponse)) {
      throw new Error("expected the announced posts");
    }
    const posts = response.posts;
    const summaries = Object.fromEntries(posts.map((post) => [post.title, post.summary]));
    expect(summaries).toEqual({
      "No summary": "The first line.",
      "With summary": "Written by hand.",
      Mature: null,
    });
  });
});

// #118: `post_excerpt` keeps its own copy of the summary limit in SQL. A first sentence
// with no break is cut to exactly that length, so the two cannot drift apart unseen.
test("post_excerpt cuts at POST_SUMMARY_MAX_LENGTH", async () => {
  const [row] = await sql<{ length: number }[]>`
    select char_length(public.post_excerpt(repeat('a', 1000))) as length`;
  expect(row?.length).toBe(POST_SUMMARY_MAX_LENGTH);
});
