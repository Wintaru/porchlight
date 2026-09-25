import type { ContentAuthor } from "./ContentAuthor";
import type { PostOrigin } from "./PostOrigin";
import type { PostStatus } from "./PostStatus";
import type { PostVisibility } from "./PostVisibility";
import type { Tag } from "./Tag";

// A post as every layer sees it (SPEC.md §5). `bodyMd` is canonical and `bodyHtml` is
// the sanitized render cached on every save (D3). The Accessor maps the `posts` row and
// its `post_tags` to this shape, so no layer above it knows the column names.
export interface Post {
  readonly id: string;
  readonly author: ContentAuthor;
  readonly slug: string;
  readonly title: string;
  readonly bodyMd: string;
  readonly bodyHtml: string;
  readonly summary: string | null;
  readonly coverMediaId: string | null;
  readonly status: PostStatus;
  readonly visibility: PostVisibility;
  readonly commentsEnabled: boolean;
  // The current reason for the current `rejected` status (#11). Null once a later
  // action moves the post off `rejected`.
  readonly rejectionReason: string | null;
  readonly tags: readonly Tag[];
  // Where the post came from and who has looked at it since (D22, SPEC.md §17).
  // `reviewedAt` is the last save or publish by a person, signed in or anonymous at a
  // form: null on an agent draft nobody has opened.
  readonly origin: PostOrigin;
  readonly agentTokenId: string | null;
  readonly reviewedAt: Date | null;
  // The agent's own text at its first write, frozen after (D22): null when no agent
  // wrote this post. Only the member and their agent ever see it.
  readonly agentDraftMd: string | null;
  readonly publishedAt: Date | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}
