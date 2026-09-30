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
