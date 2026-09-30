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
