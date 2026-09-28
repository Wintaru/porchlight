import type { IPostAccessor } from "../../../Accessors/PostAccessor/IPostAccessor";
import { AnnouncePostRequest } from "../../../Accessors/PostAccessor/Requests/AnnouncePostRequest";
import { PostAnnouncedResponse } from "../../../Accessors/PostAccessor/Responses/PostAnnouncedResponse";
import type { IHandler } from "../../../Common/IHandler";
import type { NotifyFollowersRequest } from "../Requests/NotifyFollowersRequest";
import { FollowerNoticeUnavailableResponse } from "../Responses/FollowerNoticeUnavailableResponse";
import { FollowersNotifiedResponse } from "../Responses/FollowersNotifiedResponse";

type Result = FollowersNotifiedResponse | FollowerNoticeUnavailableResponse;

// The one path that tells a post's followers it is out (#24, #87). An unlisted post is
// not announced: it is out, but only to people with the link. A post is announced once,
// ever: the store's claim stops a re-publish, a retry, a double-click and two
// moderators approving together from telling followers again, so a caller may ask
// after every move to `published`. The store claims and writes the notices together.
// A failure is logged here and does not fail the caller: the post is already out, and
// failing now would make its author or moderator try again for nothing.
export class TransformNotifyFollowersHandler implements IHandler<
  NotifyFollowersRequest,
  Result
> {
  constructor(private readonly posts: IPostAccessor) {}

  async handle(request: NotifyFollowersRequest): Promise<Result> {
    const { correlationId, post, timestamp } = request;
    if (post.status !== "published" || post.visibility !== "public") {
      return new FollowersNotifiedResponse(correlationId, 0);
    }
    const announced = await this.posts.store(
      new AnnouncePostRequest(post.id, { correlationId, timestamp }),
    );
    if (announced instanceof PostAnnouncedResponse) {
      return new FollowersNotifiedResponse(correlationId, announced.count);
    }
    const reason =
      "reason" in announced && typeof announced.reason === "string"
        ? announced.reason
        : `unexpected ${announced.constructor.name} from posts.store`;
    console.error(`followers of post ${post.id} not notified [${correlationId}]`, reason);
    return new FollowerNoticeUnavailableResponse(correlationId, reason);
  }
}
