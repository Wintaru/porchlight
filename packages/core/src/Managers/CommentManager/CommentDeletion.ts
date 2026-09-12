// What a delete did: the row is gone, or it stayed as a tombstone because replies still
// hang under it (D5).
export const COMMENT_DELETIONS = ["removed", "tombstoned"] as const;

export type CommentDeletion = (typeof COMMENT_DELETIONS)[number];
