// The fields every comment has, live or tombstone. `depth` is 0 for a root and at most
// MAX_COMMENT_DEPTH (D10); the store derives it from the parent on insert.
export interface CommentBase {
  readonly id: string;
  readonly postId: string;
  readonly parentId: string | null;
  readonly depth: number;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}
