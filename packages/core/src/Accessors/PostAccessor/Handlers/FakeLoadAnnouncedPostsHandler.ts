import type { AnnouncedPost } from "../../../Common/AnnouncedPost";
import type { IHandler } from "../../../Common/IHandler";
import type { FakePostState } from "../FakePostState";
import type { LoadAnnouncedPostsRequest } from "../Requests/LoadAnnouncedPostsRequest";
import { AnnouncedPostsLoadedResponse } from "../Responses/AnnouncedPostsLoadedResponse";
import { PostAccessFailedResponse } from "../Responses/PostAccessFailedResponse";

// The fake has no profiles table, so a post's author handle is its author id.
export class FakeLoadAnnouncedPostsHandler implements IHandler<
  LoadAnnouncedPostsRequest,
  AnnouncedPostsLoadedResponse | PostAccessFailedResponse
> {
  constructor(private readonly state: FakePostState) {}

  handle(
    request: LoadAnnouncedPostsRequest,
  ): Promise<AnnouncedPostsLoadedResponse | PostAccessFailedResponse> {
    const { since, until, authorId: scope, limit, correlationId } = request;
    if (this.state.failing) {
      return Promise.resolve(
        new PostAccessFailedResponse(correlationId, "POST_FAKE_RESULT=fail"),
      );
    }
    const posts: AnnouncedPost[] = [];
    for (const [postId, announcedAt] of this.state.announced) {
      const post = this.state.posts.get(postId);
      if (
        post?.status !== "published" ||
        post.visibility !== "public" ||
        announcedAt <= since ||
        announcedAt > until
      ) {
        continue;
      }
      const authorId = post.author.kind === "member" ? post.author.profileId : null;
      if (scope !== null && authorId !== scope) {
        continue;
      }
      posts.push({
        id: post.id,
        title: post.title,
        summary: post.summary,
        slug: post.slug,
        authorId,
        authorHandle: authorId,
        authorName: null,
        announcedAt,
      });
    }
    posts.sort((a, b) => a.announcedAt.getTime() - b.announcedAt.getTime());
    return Promise.resolve(
      new AnnouncedPostsLoadedResponse(correlationId, posts.slice(0, limit)),
    );
  }
}
