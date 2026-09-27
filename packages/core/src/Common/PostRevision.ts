// An earlier version of a published post (#23): what readers saw from `savedAt` until
// a later save replaced it at `replacedAt`.
export interface PostRevision {
  readonly id: string;
  readonly postId: string;
  readonly title: string;
  readonly summary: string | null;
  readonly bodyMd: string;
  readonly savedAt: Date;
  readonly replacedAt: Date;
}
