import type { Comment } from "../../Common/Comment";

// One comment with its replies, oldest first, as the post page walks it (SPEC.md §5).
export interface CommentNode {
  readonly comment: Comment;
  readonly replies: readonly CommentNode[];
}
