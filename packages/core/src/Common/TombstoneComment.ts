import type { CommentBase } from "./CommentBase";

// An erased comment that keeps its place so the replies under it stay readable (D5).
// No author and no body, by the schema's CHECKs, so the type has neither.
export interface TombstoneComment extends CommentBase {
  readonly status: "tombstone";
}
