import type { IHandler } from "../../../Common/IHandler";
import type { AnnounceFanOut } from "../AnnounceFanOut";
import type { FakePostState } from "../FakePostState";
import type { AnnouncePostRequest } from "../Requests/AnnouncePostRequest";
import { PostAccessFailedResponse } from "../Responses/PostAccessFailedResponse";
import { PostAnnouncedResponse } from "../Responses/PostAnnouncedResponse";

type Result = PostAnnouncedResponse | PostAccessFailedResponse;

// Mirrors `announce_post`: the claim is taken before the fan-out, as the row lock is,
// and given back when the fan-out fails or throws, as the rollback does. Unlike the
// row lock, a second caller during the fan-out does not wait: it answers 0.
export class FakeAnnouncePostHandler implements IHandler<AnnouncePostRequest, Result> {
  constructor(
    private readonly state: FakePostState,
    private readonly fanOut: AnnounceFanOut,
  ) {}

  async handle(request: AnnouncePostRequest): Promise<Result> {
    const { postId, correlationId, timestamp } = request;
    if (this.state.failing) {
      return new PostAccessFailedResponse(correlationId, "POST_FAKE_RESULT=fail");
    }
    const post = this.state.posts.get(postId);
    if (
      post?.status !== "published" ||
      post.visibility !== "public" ||
      this.state.announced.has(postId)
    ) {
      return new PostAnnouncedResponse(correlationId, 0);
    }
    this.state.announced.set(postId, timestamp);
    let kept = false;
    try {
      const fanned = await this.fanOut(post, { correlationId, timestamp });
      if (fanned.kind === "failed") {
        return new PostAccessFailedResponse(correlationId, fanned.reason);
      }
      kept = true;
      return new PostAnnouncedResponse(correlationId, fanned.count);
    } finally {
      if (!kept) {
        this.state.announced.delete(postId);
      }
    }
  }
}
