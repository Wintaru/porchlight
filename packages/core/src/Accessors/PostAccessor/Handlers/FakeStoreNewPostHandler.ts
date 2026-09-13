import type { IHandler } from "../../../Common/IHandler";
import type { Post } from "../../../Common/Post";
import type { FakePostState } from "../FakePostState";
import type { StoreNewPostRequest } from "../Requests/StoreNewPostRequest";
import { PostAccessFailedResponse } from "../Responses/PostAccessFailedResponse";
import { PostSlugTakenResponse } from "../Responses/PostSlugTakenResponse";
import { PostStoredResponse } from "../Responses/PostStoredResponse";

// Mirrors the schema's defaults (draft, no cover, timestamps now) and the slug's unique
// constraint.
export class FakeStoreNewPostHandler implements IHandler<
  StoreNewPostRequest,
  PostStoredResponse | PostSlugTakenResponse | PostAccessFailedResponse
> {
  constructor(private readonly state: FakePostState) {}

  handle(
    request: StoreNewPostRequest,
  ): Promise<PostStoredResponse | PostSlugTakenResponse | PostAccessFailedResponse> {
    const { post, correlationId, timestamp } = request;
    if (this.state.failing) {
      return Promise.resolve(
        new PostAccessFailedResponse(correlationId, "POST_FAKE_RESULT=fail"),
      );
    }
    if (this.state.bySlug(post.slug) !== undefined) {
      return Promise.resolve(new PostSlugTakenResponse(correlationId, post.slug));
    }
    const stored: Post = {
      id: globalThis.crypto.randomUUID(),
      author: post.author,
      slug: post.slug,
      title: post.title,
      bodyMd: post.bodyMd,
      bodyHtml: post.bodyHtml,
      summary: post.summary,
      coverMediaId: null,
      status: "draft",
      visibility: post.visibility,
      commentsEnabled: post.commentsEnabled,
      rejectionReason: null,
      tags: post.tags,
      publishedAt: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    this.state.posts.set(stored.id, stored);
    return Promise.resolve(new PostStoredResponse(correlationId, stored));
  }
}
