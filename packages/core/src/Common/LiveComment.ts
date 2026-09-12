import type { CommentBase } from "./CommentBase";
import type { CommentStatus } from "./CommentStatus";
import type { ContentAuthor } from "./ContentAuthor";

// A comment that still has its words: every status but `tombstone`. `bodyMd` is
// canonical and `bodyHtml` the sanitized render cached on every save (D3).
export interface LiveComment extends CommentBase {
  readonly status: Exclude<CommentStatus, "tombstone">;
  readonly author: ContentAuthor;
  readonly bodyMd: string;
  readonly bodyHtml: string;
}
