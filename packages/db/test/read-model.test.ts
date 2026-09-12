import { expect, test } from "vitest";

import { createDbClient } from "../src/index.js";
import { LOCAL_STACK, SEED } from "./local-stack.js";

// The issue #3 acceptance test: the feed read-model can query published posts with the
// anon key, through PostgREST, the same path the browser takes (D2).
const anon = createDbClient(LOCAL_STACK.apiUrl, LOCAL_STACK.anonKey);

test("the feed reads published public posts with their author over the anon key", async () => {
  const { data, error } = await anon
    .from("posts")
    .select(
      "slug, title, summary, published_at, author:profiles!posts_author_id_fkey(handle, display_name)",
    )
    .eq("status", "published")
    .eq("visibility", "public")
    .order("published_at", { ascending: false });

  expect(error).toBeNull();
  expect(data?.map((post) => post.slug)).toEqual([
    "hello-from-the-porch",
    "welcome-to-porchlight",
  ]);
  expect(data?.[0]?.author?.handle).toBe("theo");
});

test("filters the anon key cannot see through come back empty, not as errors", async () => {
  const { data, error } = await anon.from("posts").select("id").eq("id", SEED.draftPost);
  expect(error).toBeNull();
  expect(data).toEqual([]);
});

test("a select * on profiles is refused, so the read-model must name its columns", async () => {
  const { error } = await anon.from("profiles").select("*").limit(1);
  expect(error?.code).toBe("42501");
});

test("a write over the anon key is refused", async () => {
  const { error } = await anon.from("tags").insert({ slug: "nope", name: "Nope" });
  expect(error?.code).toBe("42501");
});
