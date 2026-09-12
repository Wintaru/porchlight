import type { ContentAuthor } from "../../Common/ContentAuthor";
import type { PostStatus } from "../../Common/PostStatus";

// What an action is aimed at. A rule narrows on `kind` before it reads anything else,
// so a rule handed the wrong subject is a type error. `site` is for actions with no
// target of their own, such as creating a post.
export type PermissionSubject =
  | { readonly kind: "profile"; readonly id: string }
  | {
      readonly kind: "post";
      readonly id: string;
      readonly author: ContentAuthor;
      readonly status: PostStatus;
    }
  | { readonly kind: "site" };
