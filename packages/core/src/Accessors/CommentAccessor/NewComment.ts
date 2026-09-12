import type { CommentStatus } from "../../Common/CommentStatus";
import type { ContentAuthor } from "../../Common/ContentAuthor";

// What the Manager decides about a comment before its first write. `parentId` is the
// comment it sits under after the depth rule (D10); the store derives `depth` from it.
// `status` is `pending` or `visible` by the author's trust (SPEC.md §4).
export interface NewComment {
  readonly postId: string;
  readonly parentId: string | null;
  readonly author: ContentAuthor;
  readonly bodyMd: string;
  readonly bodyHtml: string;
  readonly status: Extract<CommentStatus, "pending" | "visible">;
}
