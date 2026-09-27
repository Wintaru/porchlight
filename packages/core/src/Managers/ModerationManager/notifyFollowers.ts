import type { Post } from "../../Common/Post";
import type { RequestContext } from "../../Common/RequestContext";
import type { IFollowerNoticeEngine } from "../../Engines/FollowerNoticeEngine/IFollowerNoticeEngine";
import { NotifyFollowersRequest } from "../../Engines/FollowerNoticeEngine/Requests/NotifyFollowersRequest";
import { FollowersNotifiedResponse } from "../../Engines/FollowerNoticeEngine/Responses/FollowersNotifiedResponse";

// Tells a post's followers it is out (#24). A failure is logged and does not fail the
// publish: the post is already out, and failing now would make its author try again
// for nothing. The same helper lives in PostManager/ (a Manager may not import
// another's): keep the two in step.
export async function notifyFollowers(
  engine: IFollowerNoticeEngine,
  post: Post,
  context: RequestContext,
): Promise<void> {
  const notified = await engine.transform(new NotifyFollowersRequest(post, context));
  if (notified instanceof FollowersNotifiedResponse) {
    return;
  }
  const reason = "reason" in notified ? notified.reason : notified.constructor.name;
  console.error(
    `followers of post ${post.id} not notified [${notified.correlationId}]`,
    reason,
  );
}
