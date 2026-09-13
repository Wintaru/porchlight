import type { LiveComment } from "../../Common/LiveComment";
import type { Post } from "../../Common/Post";
import type { TrustLevel } from "../../Common/TrustLevel";

// One row in the moderation queue (SPEC.md §7). `authorTrustLevel` is null for an
// anonymous author, so the `anonymous`/`probation` filters and the queue board's own
// grouping both read off the same field. `flagged` is a post's cover media sitting at
// `flagged` scan status; comments carry no media in this schema, so it is never `true`
// for one.
export type QueueItem =
  | {
      readonly kind: "post";
      readonly post: Post;
      readonly authorTrustLevel: TrustLevel | null;
      readonly flagged: boolean;
    }
  | {
      readonly kind: "comment";
      readonly comment: LiveComment;
      readonly authorTrustLevel: TrustLevel | null;
    };
