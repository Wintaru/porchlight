import type { Sql } from "postgres";
import { afterAll, beforeAll, describe, expect, test } from "vitest";

import { createDbClient } from "../src/index";
import { asRole, connect, LOCAL_STACK, SEED } from "./local-stack";

// D18: a post with no summary shows its first sentence. `posts.excerpt` is that
// sentence, kept by the database from `body_md`.

let sql: Sql;

beforeAll(() => {
  sql = connect();
});

afterAll(async () => {
  await sql.end();
});

async function excerptOf(bodyMd: string): Promise<string | null> {
  const [row] = await sql<{ excerpt: string | null }[]>`
    select public.post_excerpt(${bodyMd}) as excerpt
  `;
  return row?.excerpt ?? null;
}

describe("post_excerpt", () => {
  test.each([
    [
      "the first sentence of the first paragraph",
      "Found this case on Reddit. I printed one too.\n\nMore here.",
      "Found this case on Reddit.",
    ],
    [
      "skips a heading, a picture and a code block",
      "# Title\n\n![a pic](https://x/y.jpg)\n\n```\ncode.\n```\n\nThe real start! Then more.",
      "The real start!",
    ],
    [
      "keeps a link's words and drops its address and marks",
      "> I *liked* [this model](https://makerworld.com/m/1). A lot.",
      "I liked this model.",
    ],
    [
      "does not stop at a lowercase word after a dot",
      "It works, e.g. on a phone. Mostly.",
      "It works, e.g. on a phone.",
    ],
    ["takes a paragraph with no stop whole", "Just a thought", "Just a thought"],
    ["skips indented code", "    indented code.\n\nThe prose.", "The prose."],
    [
      "keeps a comparison and an autolink, and drops a tag",
      "Prices < $5 at <b>two</b> shops, see <https://x.com/a>. Ok.\n\n> Quote.",
      "Prices < $5 at two shops, see https://x.com/a.",
    ],
  ])("%s", async (_, bodyMd, expected) => {
    expect(await excerptOf(bodyMd)).toBe(expected);
  });

  test("is null when the body has no prose", async () => {
    expect(await excerptOf("![only a picture](https://x/y.jpg)")).toBeNull();
  });

  test("stays fast on a whole body of lowercase stops", async () => {
    const started = performance.now();
    await excerptOf("a. ".repeat(33_000));
    expect(performance.now() - started).toBeLessThan(1_000);
  });

  test("cuts a long sentence at a word, within the summary length", async () => {
    const excerpt = await excerptOf("word ".repeat(80));
    expect(excerpt?.endsWith("word…")).toBe(true);
    expect(excerpt?.length).toBeLessThanOrEqual(200);
  });
});

describe("posts.excerpt", () => {
  test("follows the body on every write", async () => {
    const excerpt = await asRole(sql, "service_role", async (tx) => {
      await tx`
        update public.posts set body_md = 'New first line. Second line.'
        where id = ${SEED.draftPost}
      `;
      const [row] = await tx<{ excerpt: string | null }[]>`
        select excerpt from public.posts where id = ${SEED.draftPost}
      `;
      return row?.excerpt;
    });
    expect(excerpt).toBe("New first line.");
  });

  test("the anon key reads it", async () => {
    const anon = createDbClient(LOCAL_STACK.apiUrl, LOCAL_STACK.anonKey);
    const { data, error } = await anon
      .from("posts")
      .select("excerpt")
      .eq("status", "published")
      .eq("visibility", "public")
      .limit(1);
    expect(error).toBeNull();
    expect(data?.[0]?.excerpt).toEqual(expect.any(String));
  });
});
