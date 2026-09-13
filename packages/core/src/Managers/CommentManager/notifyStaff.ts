import type { INotificationAccessor } from "../../Accessors/NotificationAccessor/INotificationAccessor";
import { RecordNotificationRequest } from "../../Accessors/NotificationAccessor/Requests/RecordNotificationRequest";
import { NotificationStoredResponse } from "../../Accessors/NotificationAccessor/Responses/NotificationStoredResponse";
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
  for (const profile of staff.profiles) {
    const stored = await notifications.store(
      new RecordNotificationRequest(
        profile.id,
        "queue.pending",
        { postId, commentId },
        {},
        context,
      ),
    );
    if (!(stored instanceof NotificationStoredResponse)) {
      return new CommentUnavailableResponse(
        context.correlationId,
        `unexpected ${stored.constructor.name} from notifications.store`,
      );
    }
  }
  return undefined;
}
