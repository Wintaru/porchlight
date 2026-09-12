import type { DbClient } from "@porchlight/db";

import type { Tag } from "../../Common/Tag";

// The one call that links a post to its tags: the `replace_post_tags` function creates
// missing tags, drops links not in the set and adds the rest in one transaction. Returns
// the error message, or undefined on success.
export async function replacePostTags(
  db: DbClient,
  postId: string,
  tags: readonly Tag[],
): Promise<string | undefined> {
  const { error } = await db.rpc("replace_post_tags", {
    p_post_id: postId,
    p_tags: tags.map((tag) => ({ slug: tag.slug, name: tag.name })),
  });
  return error === null ? undefined : error.message;
}
