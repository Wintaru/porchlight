import type { LiveComment } from "../../Common/LiveComment";
import type { Post } from "../../Common/Post";
import type { Report } from "../../Common/Report";

// One reported post or comment on the reports page (#40): the item as it stands and
// every open or escalated report about it, newest first. A comment carries its post's
// title, so a moderator can tell where it was said.
export type ReportedItem =
  | {
      readonly kind: "post";
      readonly post: Post;
      readonly reports: readonly Report[];
    }
  | {
      readonly kind: "comment";
      readonly comment: LiveComment;
      readonly postTitle: string;
      readonly reports: readonly Report[];
    };
