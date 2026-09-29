import type { IFollowAccessor } from "../Accessors/FollowAccessor/IFollowAccessor";
import { LoadFollowerIdsRequest } from "../Accessors/FollowAccessor/Requests/LoadFollowerIdsRequest";
import { FollowerIdsLoadedResponse } from "../Accessors/FollowAccessor/Responses/FollowerIdsLoadedResponse";
import type { IMemberBlockAccessor } from "../Accessors/MemberBlockAccessor/IMemberBlockAccessor";
import { LoadMemberBlocksByMemberRequest } from "../Accessors/MemberBlockAccessor/Requests/LoadMemberBlocksByMemberRequest";
import { LoadMemberBlocksOfTargetRequest } from "../Accessors/MemberBlockAccessor/Requests/LoadMemberBlocksOfTargetRequest";
import { MemberBlocksLoadedResponse } from "../Accessors/MemberBlockAccessor/Responses/MemberBlocksLoadedResponse";
import type { INotificationAccessor } from "../Accessors/NotificationAccessor/INotificationAccessor";
import { RecordNotificationsRequest } from "../Accessors/NotificationAccessor/Requests/RecordNotificationsRequest";
import { NotificationsRecordedResponse } from "../Accessors/NotificationAccessor/Responses/NotificationsRecordedResponse";
import type { AnnounceFanOut } from "../Accessors/PostAccessor/AnnounceFanOut";
import type { ResponseBase } from "../Common/ResponseBase";

// The fake stores' copy of the recipient rule in `announce_post` (#87): followers of
// the author and of each tag, each once, minus the author, minus anyone who muted or
// blocked the author, minus anyone the author blocked (#115). Keep the two in step; packages/db/test/schema.test.ts proves
// the SQL one and DependencyContainer.follow.test.ts this one. Test wiring only: the
// Supabase post store does the fan-out in the database and never calls this.
export function createFakeAnnounceFanOut(
  follows: IFollowAccessor,
  memberBlocks: IMemberBlockAccessor,
  notifications: INotificationAccessor,
): AnnounceFanOut {
  return async (post, context) => {
    const authorId = post.author.kind === "member" ? post.author.profileId : null;
    const loaded = await follows.load(
      new LoadFollowerIdsRequest(
        authorId,
        post.tags.map((tag) => tag.slug),
        context,
      ),
    );
    if (!(loaded instanceof FollowerIdsLoadedResponse)) {
      return failed(loaded);
    }
    let recipients = loaded.followerIds.filter((id) => id !== authorId);
    if (authorId !== null && recipients.length > 0) {
      const held = await memberBlocks.load(
        new LoadMemberBlocksOfTargetRequest(authorId, recipients, context),
      );
      if (!(held instanceof MemberBlocksLoadedResponse)) {
        return failed(held);
      }
      const blockedByAuthor = await memberBlocks.load(
        new LoadMemberBlocksByMemberRequest(authorId, context),
      );
      if (!(blockedByAuthor instanceof MemberBlocksLoadedResponse)) {
        return failed(blockedByAuthor);
      }
      const shut = new Set([
        ...held.blocks.map((block) => block.memberId),
        ...blockedByAuthor.blocks
          .filter((block) => block.level === "block")
          .map((block) => block.targetId),
      ]);
      recipients = recipients.filter((id) => !shut.has(id));
    }
    if (recipients.length === 0) {
      return { kind: "recorded", count: 0 };
    }
    const stored = await notifications.store(
      new RecordNotificationsRequest(
        recipients,
        "post.published",
        { postId: post.id },
        {},
        context,
      ),
    );
    if (!(stored instanceof NotificationsRecordedResponse)) {
      return failed(stored);
    }
    return { kind: "recorded", count: stored.count };
  };
}

function failed(response: ResponseBase): { kind: "failed"; reason: string } {
  const reason =
    "reason" in response && typeof response.reason === "string"
      ? response.reason
      : `unexpected ${response.constructor.name}`;
  return { kind: "failed", reason };
}
