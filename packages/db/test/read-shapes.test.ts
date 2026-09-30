import type { Sql } from "postgres";
import { afterAll, beforeAll, describe, expect, test } from "vitest";

import { asRole, connect, SEED, seededAs } from "./local-stack";

// The functions that answer the read-model in the shape a page shows, instead of the
// rows it used to count or throw away in the app.

let sql: Sql;

beforeAll(() => {
  sql = connect();
});

afterAll(async () => {
  await sql.end();
});

describe("public_tags", () => {
  test("names only the tags on a public, published post", async () => {
    const slugs = await asRole(sql, "anon", async (tx) =>
      (
        await tx<{ slug: string }[]>`select slug from public.public_tags() order by slug`
      ).map((row) => row.slug),
    );
    // `hiking` is only on a pending post, and `mature` on none.
    expect(slugs).toEqual(["making", "porch-talk"]);
  });

  test("drops a tag once its only public post goes private", async () => {
    const slugs = await seededAs(
      sql,
      "anon",
      undefined,
      (tx) =>
        tx`update public.posts set visibility = 'private' where id = ${SEED.publicPost}`,
      async (tx) =>
        (await tx<{ slug: string }[]>`select slug from public.public_tags()`).map(
          (row) => row.slug,
        ),
    );
    expect(slugs).not.toContain("making");
  });
});

interface CountRow {
  readonly comment_id: string | null;
  readonly kind: string;
  readonly total: number;
  readonly mine: boolean;
}

function countsFor(
  tx: Parameters<Parameters<typeof asRole>[2]>[0],
  viewer: string | null,
) {
  return tx<CountRow[]>`
    select comment_id, kind::text, total, mine
    from public.post_reaction_counts(${SEED.publicPost}, ${viewer})
    order by comment_id nulls first, kind
  `;
}

describe("post_reaction_counts", () => {
  test("counts per item and kind, and marks the viewer's own", async () => {
    const rows = await seededAs(
      sql,
      "anon",
      undefined,
      (tx) => tx`
        insert into public.reactions (post_id, comment_id, profile_id, kind)
        values (${SEED.publicPost}, null, ${SEED.trustedMember}, 'heart')
      `,
      (tx) => countsFor(tx, SEED.admin),
    );
    expect(rows).toEqual([
      { comment_id: null, kind: "clap", total: 1, mine: false },
      { comment_id: null, kind: "heart", total: 2, mine: true },
      { comment_id: SEED.visibleComment, kind: "laugh", total: 1, mine: false },
    ]);
  });

  test("marks nothing as the viewer's own without a viewer", async () => {
    const rows = await asRole(sql, "anon", (tx) => countsFor(tx, null));
    expect(rows.every((row) => !row.mine)).toBe(true);
  });

  test("leaves out reactions on a comment the reader cannot see", async () => {
    const rows = await seededAs(
      sql,
      "anon",
      undefined,
      (tx) => tx`
        insert into public.reactions (post_id, comment_id, profile_id, kind)
        values (null, ${SEED.pendingComment}, ${SEED.admin}, 'wow')
      `,
      (tx) => countsFor(tx, null),
    );
    expect(rows.map((row) => row.comment_id)).not.toContain(SEED.pendingComment);
  });
});

describe("several_published_authors", () => {
  test("is true with two authors of public posts", async () => {
    const [row] = await asRole(
      sql,
      "anon",
      (tx) =>
        tx<{ several: boolean }[]>`select public.several_published_authors() as several`,
    );
    expect(row?.several).toBe(true);
  });

  test("is false with one", async () => {
    const [row] = await seededAs(
      sql,
      "anon",
      undefined,
      (tx) =>
        tx`update public.posts set status = 'draft' where author_id = ${SEED.admin}`,
      (tx) =>
        tx<{ several: boolean }[]>`select public.several_published_authors() as several`,
    );
    expect(row?.several).toBe(false);
  });
});
