import type { IPostAccessor } from "../Accessors/PostAccessor/IPostAccessor";
import { HandlerResolverBuilder } from "../Common/HandlerResolverBuilder";
import { FollowerNoticeEngine } from "../Engines/FollowerNoticeEngine/FollowerNoticeEngine";
import { TransformNotifyFollowersHandler } from "../Engines/FollowerNoticeEngine/Handlers/TransformNotifyFollowersHandler";
import type { IFollowerNoticeEngine } from "../Engines/FollowerNoticeEngine/IFollowerNoticeEngine";
import { NotifyFollowersRequest } from "../Engines/FollowerNoticeEngine/Requests/NotifyFollowersRequest";

// The `post.published` fan-out (#24, #87).
export function createFollowerNoticeEngine(posts: IPostAccessor): IFollowerNoticeEngine {
  return new FollowerNoticeEngine(
    new HandlerResolverBuilder()
      .register(NotifyFollowersRequest, new TransformNotifyFollowersHandler(posts))
      .build(),
  );
}
