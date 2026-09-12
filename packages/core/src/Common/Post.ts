import type { PostAuthor } from "./PostAuthor";
import type { PostStatus } from "./PostStatus";
import type { PostVisibility } from "./PostVisibility";
import type { Tag } from "./Tag";

// A post as every layer sees it (SPEC.md §5). `bodyMd` is canonical and `bodyHtml` is
// the sanitized render cached on every save (D3). The Accessor maps the `posts` row and
// its `post_tags` to this shape, so no layer above it knows the column names.
export interface Post {
  readonly id: string;
  readonly author: PostAuthor;
  readonly slug: string;
  readonly title: string;
  readonly bodyMd: string;
  readonly bodyHtml: string;
  readonly summary: string | null;
  readonly coverMediaId: string | null;
  readonly status: PostStatus;
  readonly visibility: PostVisibility;
  readonly commentsEnabled: boolean;
  readonly tags: readonly Tag[];
  readonly publishedAt: Date | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}
