import type { CommentStatus } from "./CommentStatus";
import type { PostStatus } from "./PostStatus";

// One line of the anonymous status page (D13): a post or a comment the author wrote,
// where it stands, and how many visible replies it has. A comment's `title` is the
// first line of its body. `postAuthorHandle` is set once the post is claimed, so the
// page can link `/@handle/slug` instead of `/p/slug`.
export type AnonymousStatusItem =
  | {
      readonly kind: "post";
      readonly id: string;
      readonly title: string;
      readonly status: PostStatus;
      readonly createdAt: Date;
      readonly replyCount: number;
      readonly postSlug: string;
      readonly postAuthorHandle: string | null;
    }
  | {
      readonly kind: "comment";
      readonly id: string;
      readonly title: string;
      readonly status: CommentStatus;
      readonly createdAt: Date;
      readonly replyCount: number;
      readonly postSlug: string;
      readonly postAuthorHandle: string | null;
    };
