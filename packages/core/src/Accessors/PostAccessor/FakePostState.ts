import type { Post } from "../../Common/Post";
import type { PostRevision } from "../../Common/PostRevision";

// The fake's "tables": posts by id, with their tags inline, and the revisions the
// `posts_keep_revision` trigger writes, oldest first. `failing` makes every call answer
// PostAccessFailedResponse, for the error path.
export class FakePostState {
  readonly posts = new Map<string, Post>();
  readonly revisions: PostRevision[] = [];
  // Posts whose followers were told they are out, and when (`announced_at`).
  readonly announced = new Map<string, Date>();

  constructor(readonly failing = false) {}

  bySlug(slug: string): Post | undefined {
    for (const post of this.posts.values()) {
      if (post.slug === slug) {
        return post;
      }
    }
    return undefined;
  }
}
