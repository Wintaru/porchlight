import type { ContentAuthor } from "../../Common/ContentAuthor";
import type { PostOrigin } from "../../Common/PostOrigin";
import type { PostVisibility } from "../../Common/PostVisibility";
import type { Tag } from "../../Common/Tag";

// What the Manager decides about a post before its first write. Every post starts as a
// draft; status and the timestamps come from the store's defaults.
export interface NewPost {
  readonly author: ContentAuthor;
  readonly slug: string;
  readonly title: string;
  readonly bodyMd: string;
  readonly bodyHtml: string;
  readonly summary: string | null;
  readonly visibility: PostVisibility;
  readonly commentsEnabled: boolean;
  readonly coverMediaId: string | null;
  readonly tags: readonly Tag[];
  // Provenance, decided by the Manager from the actor (D22): an agent's draft names
  // its token and is unreviewed until a person saves it.
  readonly origin: PostOrigin;
  readonly agentTokenId: string | null;
  readonly reviewedAt: Date | null;
}
