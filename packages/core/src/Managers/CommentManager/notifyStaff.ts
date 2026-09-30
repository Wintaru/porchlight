import type { INotificationAccessor } from "../../Accessors/NotificationAccessor/INotificationAccessor";
import { RecordNotificationsRequest } from "../../Accessors/NotificationAccessor/Requests/RecordNotificationsRequest";
import { NotificationsRecordedResponse } from "../../Accessors/NotificationAccessor/Responses/NotificationsRecordedResponse";
import type { IProfileAccessor } from "../../Accessors/ProfileAccessor/IProfileAccessor";
import { ListStaffProfilesRequest } from "../../Accessors/ProfileAccessor/Requests/ListStaffProfilesRequest";
import { StaffProfilesLoadedResponse } from "../../Accessors/ProfileAccessor/Responses/StaffProfilesLoadedResponse";
import type { RequestContext } from "../../Common/RequestContext";
import { CommentUnavailableResponse } from "./Responses/CommentUnavailableResponse";

// Fans a `queue.pending` notification out to every active admin and moderator
// (SPEC.md §8): a comment on probation waits for one of them.
export async function notifyStaffOfPendingComment(
  profiles: IProfileAccessor,
  notifications: INotificationAccessor,
  postId: string,
  commentId: string,
  context: Required<Pick<RequestContext, "correlationId">>,
): Promise<CommentUnavailableResponse | undefined> {
  const staff = await profiles.load(new ListStaffProfilesRequest(context));
  if (!(staff instanceof StaffProfilesLoadedResponse)) {
    return new CommentUnavailableResponse(
      context.correlationId,
      `unexpected ${staff.constructor.name} from profiles.load`,
    );
  }
  if (staff.profiles.length === 0) {
    return undefined;
  }
  // One write for every recipient, so they are all told or none are.
  const stored = await notifications.store(
    new RecordNotificationsRequest(
      staff.profiles.map((profile) => profile.id),
      "queue.pending",
      { postId, commentId },
      {},
      context,
    ),
  );
  if (!(stored instanceof NotificationsRecordedResponse)) {
    return new CommentUnavailableResponse(
      context.correlationId,
      `unexpected ${stored.constructor.name} from notifications.store`,
    );
  }
  return undefined;
}
