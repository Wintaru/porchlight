// Why a comment was refused before any write. `empty-body` is a blank comment;
// `no-such-post` means the post is not there; `no-such-parent` means the comment being
// answered is not a visible comment on that post.
export const COMMENT_REJECTION_REASONS = [
  "empty-body",
  "no-such-post",
  "no-such-parent",
] as const;

export type CommentRejectionReason = (typeof COMMENT_REJECTION_REASONS)[number];
