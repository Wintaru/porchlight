import type { Sql, TransactionSql } from "postgres";
import { afterAll, beforeAll, describe, expect, test } from "vitest";

import {
  CHECK_VIOLATION,
  connect,
  type DbRole,
  errorCodeOf,
  SEED,
  seededAs,
} from "./local-stack";

// Issue #101 (D27): a private post is its author's alone, at the database. Every table,
// view and function a browser role reads posts through is asked as the author, a
// visitor, another member, a moderator and an admin. The seed holds no private post,
// so each check seeds one inside a transaction that is rolled back.

let sql: Sql;

beforeAll(() => {
  sql = connect();
});

afterAll(async () => {
  await sql.end();
});

const PRIVATE_POST = "00000000-0000-4000-8000-00000000f101";
const PRIVATE_COMMENT = "00000000-0000-4000-8000-00000000f102";
const PRIVATE_MEDIA = "00000000-0000-4000-8000-00000000f103";
const WORD = "journalquill";
// Theo's public post carries this tag in the seed.
const MAKING_TAG = "00000000-0000-4000-8000-0000000000e3";

// Theo writes a private post that carries a tag, a comment and a reaction from before
// it went private, and an approved picture. June follows Theo.
async function seedPrivatePost(tx: TransactionSql): Promise<void> {
  await tx`
    insert into public.posts
      (id, author_id, slug, title, body_md, status, visibility, published_at)
    values
      (${PRIVATE_POST}, ${SEED.trustedMember}, 'a-private-journal-entry',
       ${`Journal ${WORD}`}, ${`Only for me, ${WORD}.`}, 'published', 'private', now())
  `;
  await tx`
    insert into public.post_tags (post_id, tag_id) values (${PRIVATE_POST}, ${MAKING_TAG})
  `;
  await tx`
    insert into public.comments (id, post_id, author_id, status, body_md)
    values (${PRIVATE_COMMENT}, ${PRIVATE_POST}, ${SEED.probationMember}, 'visible',
            ${`A comment, ${WORD}`})
  `;
  await tx`
    insert into public.reactions (post_id, comment_id, profile_id, kind)
    values (${PRIVATE_POST}, null, ${SEED.probationMember}, 'heart')
  `;
  await tx`
    insert into public.media_assets (
      id, owner_id, storage_path, published_path, kind, mime_type, original_filename,
      bytes, sha256, scan_status, post_id, used_in_post
    ) values (
      ${PRIVATE_MEDIA}, ${SEED.trustedMember}, 'theo/journal.jpg',
      'public-media/theo/journal.jpg', 'image', 'image/jpeg', 'journal.jpg', 1000,
      encode(extensions.digest('private-media', 'sha256'), 'hex'), 'clear',
      ${PRIVATE_POST}, true
    )
  `;
  await tx`
    insert into public.follows (follower_id, author_id)
    values (${SEED.probationMember}, ${SEED.trustedMember})
  `;
}

interface Seen {
  readonly posts: number;
  readonly comments: number;
  readonly postTags: number;
  readonly reactions: number;
  readonly media: number;
  readonly search: number;
  readonly listed: number;
  readonly listedByTag: number;
  readonly following: number;
}

// What this caller reads of the private post, through every door.
async function seenBy(role: DbRole, sub: string | undefined): Promise<Seen> {
  return seededAs(sql, role, sub, seedPrivatePost, async (tx) => {
    const count = async (rows: Promise<readonly unknown[]>) => (await rows).length;
    const signedIn = role === "authenticated";
    return {
      posts: await count(tx`select id from public.posts where id = ${PRIVATE_POST}`),
      comments: await count(
        tx`select id from public.comments where post_id = ${PRIVATE_POST}`,
      ),
      postTags: await count(
        tx`select tag_id from public.post_tags where post_id = ${PRIVATE_POST}`,
      ),
      reactions: await count(
        tx`select kind from public.reactions where post_id = ${PRIVATE_POST}`,
      ),
      media: await count(
        tx`select id from public.media_assets where id = ${PRIVATE_MEDIA}`,
      ),
      search: await count(
        tx`select post_id from public.search_site(${WORD}, 50) where post_id = ${PRIVATE_POST}`,
      ),
      // The two feed functions refuse a visitor outright (rls.test.ts).
      listed: signedIn
        ? await count(
            tx`select id from public.listed_post_ids(null, 50) where id = ${PRIVATE_POST}`,
          )
        : 0,
      listedByTag: signedIn
        ? await count(
            tx`select id from public.listed_post_ids(${MAKING_TAG}, 50)
               where id = ${PRIVATE_POST}`,
          )
        : 0,
      following: signedIn
        ? await count(
            tx`select id from public.following_post_ids(50) where id = ${PRIVATE_POST}`,
          )
        : 0,
    };
  });
}

const NOTHING: Seen = {
  posts: 0,
  comments: 0,
  postTags: 0,
  reactions: 0,
  media: 0,
  search: 0,
  listed: 0,
  listedByTag: 0,
  following: 0,
};

describe("a private post (#101)", () => {
  test("its author reads it, its comments, tags and picture, and sees it in their feed", async () => {
    expect(await seenBy("authenticated", SEED.trustedMember)).toEqual({
      posts: 1,
      comments: 1,
      postTags: 1,
      reactions: 1,
      media: 1,
      // Search, a tag's feed and Following list public posts only, for everyone.
      search: 0,
      listed: 1,
      listedByTag: 0,
      following: 0,
    });
  });

  test.each([
    ["a visitor", "anon", undefined],
    ["a moderator", "authenticated", SEED.moderator],
    ["an admin", "authenticated", SEED.admin],
  ] as const)("%s reads nothing of it through any door", async (_who, role, sub) => {
    expect(await seenBy(role, sub)).toEqual(NOTHING);
  });

  test("another member, who follows the author, reads only their own comment on it", async () => {
    // June wrote the comment while the post was public. `comments_own_read` still hands
    // her her own words (her export has them too), and nothing of the post.
    expect(await seenBy("authenticated", SEED.probationMember)).toEqual({
      ...NOTHING,
      comments: 1,
    });
  });

  test("the author's other posts stay in their feed beside it", async () => {
    const listed = await seededAs(
      sql,
      "authenticated",
      SEED.trustedMember,
      seedPrivatePost,
      async (tx) =>
        (await tx<{ id: string }[]>`select id from public.listed_post_ids(null, 50)`).map(
          (row) => row.id,
        ),
    );
    expect(listed).toEqual(expect.arrayContaining([PRIVATE_POST, SEED.publicPost]));
  });

  test("never waits in the queue, and never belongs to an anonymous author", async () => {
    const pending = await errorCodeOf(() =>
      seededAs(
        sql,
        "service_role",
        undefined,
        seedPrivatePost,
        (tx) => tx`update public.posts set status = 'pending' where id = ${PRIVATE_POST}`,
      ),
    );
    expect(pending).toBe(CHECK_VIOLATION);

    const anonymous = await errorCodeOf(() =>
      seededAs(
        sql,
        "service_role",
        undefined,
        seedPrivatePost,
        (tx) =>
          tx`update public.posts set visibility = 'private'
           where id = ${SEED.anonymousPendingPost}`,
      ),
    );
    expect(anonymous).toBe(CHECK_VIOLATION);
  });
});
