import type { ContentAuthor } from "../../Common/ContentAuthor";
import type { LiveComment } from "../../Common/LiveComment";
import type { Post } from "../../Common/Post";
import type { PostStatus } from "../../Common/PostStatus";

// A moderatable item, loaded and normalized (#11). A tombstone comment has nothing left
// to moderate, so it never reaches this shape — callers see NoSuchItemResponse instead,
// the same as an id nobody recognizes.
export type LoadedItem =
  | { readonly kind: "post"; readonly post: Post }
  | {
      readonly kind: "comment";
      readonly comment: LiveComment;
      readonly postStatus: PostStatus;
      // Whose post the comment is on: their block stops the comment's approval (#85).
      readonly postAuthor: ContentAuthor;
    };
