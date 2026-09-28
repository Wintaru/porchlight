import type { CommentStatus } from "../../Common/CommentStatus";
import type { ContentAuthor } from "../../Common/ContentAuthor";
import type { PostStatus } from "../../Common/PostStatus";
import type { PostVisibility } from "../../Common/PostVisibility";
import type { ScanStatus } from "../../Common/ScanStatus";

// What an action is aimed at. A rule narrows on `kind` before it reads anything else,
// so a rule handed the wrong subject is a type error. `site` is for actions with no
// target of their own, such as creating a post. A comment subject carries the status
// of the post it sits on, so one rule can say "a visible comment on a published post".
// Both carry the post's visibility: a private post, and every comment on it, is its
// author's alone (D27), whatever the actor's role.
export type PermissionSubject =
  | { readonly kind: "profile"; readonly id: string }
  | {
      readonly kind: "post";
      readonly id: string;
      readonly author: ContentAuthor;
      readonly status: PostStatus;
      readonly visibility: PostVisibility;
      readonly commentsEnabled: boolean;
    }
  | {
      readonly kind: "comment";
      readonly id: string;
      readonly author: ContentAuthor | null;
      readonly status: CommentStatus;
      readonly postStatus: PostStatus;
      readonly postVisibility: PostVisibility;
    }
  | {
      readonly kind: "media";
      readonly id: string;
      readonly owner: ContentAuthor;
      readonly publishedPath: string | null;
      readonly scanStatus: ScanStatus;
    }
  | { readonly kind: "anonymousAuthor"; readonly id: string }
  | { readonly kind: "site" };
