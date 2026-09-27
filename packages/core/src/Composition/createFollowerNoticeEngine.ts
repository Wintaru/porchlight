import type { IFollowAccessor } from "../Accessors/FollowAccessor/IFollowAccessor";
import type { IPostAccessor } from "../Accessors/PostAccessor/IPostAccessor";
import type { IMemberBlockAccessor } from "../Accessors/MemberBlockAccessor/IMemberBlockAccessor";
import type { INotificationAccessor } from "../Accessors/NotificationAccessor/INotificationAccessor";
import { HandlerResolverBuilder } from "../Common/HandlerResolverBuilder";
import { FollowerNoticeEngine } from "../Engines/FollowerNoticeEngine/FollowerNoticeEngine";
import { TransformNotifyFollowersHandler } from "../Engines/FollowerNoticeEngine/Handlers/TransformNotifyFollowersHandler";
import type { IFollowerNoticeEngine } from "../Engines/FollowerNoticeEngine/IFollowerNoticeEngine";
import { NotifyFollowersRequest } from "../Engines/FollowerNoticeEngine/Requests/NotifyFollowersRequest";

// The `post.published` fan-out (#24).
export function createFollowerNoticeEngine(
  posts: IPostAccessor,
  follows: IFollowAccessor,
  memberBlocks: IMemberBlockAccessor,
  notifications: INotificationAccessor,
): IFollowerNoticeEngine {
  return new FollowerNoticeEngine(
    new HandlerResolverBuilder()
      .register(
        NotifyFollowersRequest,
        new TransformNotifyFollowersHandler(posts, follows, memberBlocks, notifications),
      )
      .build(),
  );
}
