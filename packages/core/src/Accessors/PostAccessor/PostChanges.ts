import type { PostStatus } from "../../Common/PostStatus";
import type { PostVisibility } from "../../Common/PostVisibility";
import type { Tag } from "../../Common/Tag";

// The fields a save may change. A missing field is left as it is; `null` clears it.
// `bodyMd` and `bodyHtml` travel together: the Manager renders before it stores (D3).
// `status` and `publishedAt` are the Manager's publish and unpublish transitions.
export interface PostChanges {
  readonly title?: string;
  readonly bodyMd?: string;
  readonly bodyHtml?: string;
  readonly summary?: string | null;
  readonly visibility?: PostVisibility;
  readonly commentsEnabled?: boolean;
  readonly tags?: readonly Tag[];
  readonly status?: PostStatus;
  readonly publishedAt?: Date | null;
}
