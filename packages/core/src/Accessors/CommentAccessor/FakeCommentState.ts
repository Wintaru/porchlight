import type { Comment } from "../../Common/Comment";

// The fake's `comments` table, in insertion order. `failing` makes every call answer
// CommentAccessFailedResponse, for the error path.
export class FakeCommentState {
  readonly comments = new Map<string, Comment>();

  constructor(readonly failing = false) {}

  hasReplies(id: string): boolean {
    for (const comment of this.comments.values()) {
      if (comment.parentId === id) {
        return true;
      }
    }
    return false;
  }
}
