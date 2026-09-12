import type { PostAuthor } from "../../Common/PostAuthor";
import type { PostVisibility } from "../../Common/PostVisibility";
import type { Tag } from "../../Common/Tag";

// What the Manager decides about a post before its first write. Every post starts as a
// draft; status, the cover (#9) and the timestamps come from the store's defaults.
export interface NewPost {
  readonly author: PostAuthor;
  readonly slug: string;
  readonly title: string;
  readonly bodyMd: string;
  readonly bodyHtml: string;
  readonly summary: string | null;
  readonly visibility: PostVisibility;
  readonly commentsEnabled: boolean;
  readonly tags: readonly Tag[];
}
