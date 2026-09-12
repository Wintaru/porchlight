import type { Post } from "../../Common/Post";

// The fake's "tables": posts by id, with their tags inline. `failing` makes every call
// answer PostAccessFailedResponse, for the error path.
export class FakePostState {
  readonly posts = new Map<string, Post>();

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
