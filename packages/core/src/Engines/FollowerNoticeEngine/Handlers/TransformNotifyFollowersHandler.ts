import type { IFollowAccessor } from "../../../Accessors/FollowAccessor/IFollowAccessor";
import { LoadFollowerIdsRequest } from "../../../Accessors/FollowAccessor/Requests/LoadFollowerIdsRequest";
import { FollowerIdsLoadedResponse } from "../../../Accessors/FollowAccessor/Responses/FollowerIdsLoadedResponse";
import type { IMemberBlockAccessor } from "../../../Accessors/MemberBlockAccessor/IMemberBlockAccessor";
import { LoadMemberBlocksOfTargetRequest } from "../../../Accessors/MemberBlockAccessor/Requests/LoadMemberBlocksOfTargetRequest";
import { MemberBlocksLoadedResponse } from "../../../Accessors/MemberBlockAccessor/Responses/MemberBlocksLoadedResponse";
import type { INotificationAccessor } from "../../../Accessors/NotificationAccessor/INotificationAccessor";
import { RecordNotificationsRequest } from "../../../Accessors/NotificationAccessor/Requests/RecordNotificationsRequest";
import { NotificationsRecordedResponse } from "../../../Accessors/NotificationAccessor/Responses/NotificationsRecordedResponse";
import type { IPostAccessor } from "../../../Accessors/PostAccessor/IPostAccessor";
import { ClaimPostAnnouncementRequest } from "../../../Accessors/PostAccessor/Requests/ClaimPostAnnouncementRequest";
import { PostAlreadyAnnouncedResponse } from "../../../Accessors/PostAccessor/Responses/PostAlreadyAnnouncedResponse";
import { PostAnnouncementClaimedResponse } from "../../../Accessors/PostAccessor/Responses/PostAnnouncementClaimedResponse";
import type { IHandler } from "../../../Common/IHandler";
import type { ResponseBase } from "../../../Common/ResponseBase";
import type { NotifyFollowersRequest } from "../Requests/NotifyFollowersRequest";
import { FollowerNoticeUnavailableResponse } from "../Responses/FollowerNoticeUnavailableResponse";
import { FollowersNotifiedResponse } from "../Responses/FollowersNotifiedResponse";

type Result = FollowersNotifiedResponse | FollowerNoticeUnavailableResponse;

// Followers of the author and of every tag on the post, each once, minus the author
// and minus anyone who muted or blocked the author: they asked not to see this member.
// An unlisted post is not announced: it is out, but only to people with the link. A
// post is announced once, ever: the claim on `announced_at` stops a re-publish, a
// double-click and two moderators approving together from telling followers again.
export class TransformNotifyFollowersHandler implements IHandler<
  NotifyFollowersRequest,
  Result
> {
  constructor(
    private readonly posts: IPostAccessor,
    private readonly follows: IFollowAccessor,
    private readonly memberBlocks: IMemberBlockAccessor,
    private readonly notifications: INotificationAccessor,
  ) {}

  async handle(request: NotifyFollowersRequest): Promise<Result> {
    const { correlationId, post, timestamp } = request;
    const context = { correlationId, timestamp };
    if (post.status !== "published" || post.visibility !== "public") {
      return new FollowersNotifiedResponse(correlationId, 0);
    }
    const claimed = await this.posts.store(
      new ClaimPostAnnouncementRequest(post.id, context),
    );
    if (claimed instanceof PostAlreadyAnnouncedResponse) {
      return new FollowersNotifiedResponse(correlationId, 0);
    }
    if (!(claimed instanceof PostAnnouncementClaimedResponse)) {
      return unavailable(correlationId, claimed, "posts.store");
    }
    const authorId = post.author.kind === "member" ? post.author.profileId : null;

    const loaded = await this.follows.load(
      new LoadFollowerIdsRequest(
        authorId,
        post.tags.map((tag) => tag.slug),
        context,
      ),
    );
    if (!(loaded instanceof FollowerIdsLoadedResponse)) {
      return unavailable(correlationId, loaded, "follows.load");
    }
    let recipients = loaded.followerIds.filter((id) => id !== authorId);
    if (authorId !== null && recipients.length > 0) {
      const held = await this.memberBlocks.load(
        new LoadMemberBlocksOfTargetRequest(authorId, recipients, context),
      );
      if (!(held instanceof MemberBlocksLoadedResponse)) {
        return unavailable(correlationId, held, "memberBlocks.load");
      }
      const shut = new Set(held.blocks.map((block) => block.memberId));
      recipients = recipients.filter((id) => !shut.has(id));
    }
    if (recipients.length === 0) {
      return new FollowersNotifiedResponse(correlationId, 0);
    }
    const stored = await this.notifications.store(
      new RecordNotificationsRequest(
        recipients,
        "post.published",
        { postId: post.id },
        {},
        context,
      ),
    );
    if (!(stored instanceof NotificationsRecordedResponse)) {
      return unavailable(correlationId, stored, "notifications.store");
    }
    return new FollowersNotifiedResponse(correlationId, stored.count);
  }
}

function unavailable(
  correlationId: string,
  response: ResponseBase,
  method: string,
): FollowerNoticeUnavailableResponse {
  const reason =
    "reason" in response && typeof response.reason === "string"
      ? response.reason
      : `unexpected ${response.constructor.name} from ${method}`;
  return new FollowerNoticeUnavailableResponse(correlationId, reason);
}
