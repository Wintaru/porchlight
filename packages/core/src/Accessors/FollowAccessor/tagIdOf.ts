import type { DbClient } from "@porchlight/db";

// A tag's id from its slug, the name a follow carries it by. `id` is undefined when no
// tag has that slug; `error` is set when the read failed.
export async function tagIdOf(
  db: DbClient,
  slug: string,
): Promise<{ readonly id?: string; readonly error?: string }> {
  const { data, error } = await db
    .from("tags")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (error) {
    return { error: error.message };
  }
  return data === null ? {} : { id: data.id };
}
