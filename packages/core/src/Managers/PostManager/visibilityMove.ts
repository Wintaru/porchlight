import type { Post } from "../../Common/Post";
import type { PostVisibility } from "../../Common/PostVisibility";

// What a save's new visibility does to the post's status (D27, #101). Private must
// never be a way around moderation, and a private post must never wait in the queue:
// - `leaves-private`: a published private post turns public or unlisted. That is the
//   moment it goes out, so it takes the publish path then: up at once for a trusted
//   member, to the queue for a member on probation or a cover nobody approved yet.
// - `enters-private`: a post waiting in the queue turns private. Nobody but its author
//   can see it now, so it leaves the queue and is up at once, as a private publish is.
// - `none`: anything else, including a draft, which only moves at its publish.
export type VisibilityMove = "leaves-private" | "enters-private" | "none";

export function visibilityMoveOf(
  current: Pick<Post, "status" | "visibility">,
  next: PostVisibility | undefined,
): VisibilityMove {
  if (next === undefined || next === current.visibility) {
    return "none";
  }
  if (current.status === "published" && current.visibility === "private") {
    return "leaves-private";
  }
  if (current.status === "pending" && next === "private") {
    return "enters-private";
  }
  return "none";
}
