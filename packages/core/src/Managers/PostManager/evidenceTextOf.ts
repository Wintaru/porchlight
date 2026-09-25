import type { Post } from "../../Common/Post";

// The text a post's evidence hash covers: the title and the body exactly as stored,
// so the hash can be checked again from the row.
export function evidenceTextOf(post: Pick<Post, "title" | "bodyMd">): string {
  return `${post.title}\n\n${post.bodyMd}`;
}
