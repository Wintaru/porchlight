// What the comment form sends. `parentId` names the comment it answers, or null for a
// root comment; the Manager applies the depth rule (D10) before the write.
export interface CommentDraft {
  readonly postId: string;
  readonly parentId: string | null;
  readonly bodyMd: string;
}
