import type { INotificationAccessor } from "../../Accessors/NotificationAccessor/INotificationAccessor";
import { RecordNotificationsRequest } from "../../Accessors/NotificationAccessor/Requests/RecordNotificationsRequest";
import { NotificationsRecordedResponse } from "../../Accessors/NotificationAccessor/Responses/NotificationsRecordedResponse";
import type { IProfileAccessor } from "../../Accessors/ProfileAccessor/IProfileAccessor";
import { ListStaffProfilesRequest } from "../../Accessors/ProfileAccessor/Requests/ListStaffProfilesRequest";
import { StaffProfilesLoadedResponse } from "../../Accessors/ProfileAccessor/Responses/StaffProfilesLoadedResponse";
import type { RequestContext } from "../../Common/RequestContext";
import { PostUnavailableResponse } from "./Responses/PostUnavailableResponse";

// Fans a `queue.pending` notification out to every active admin and moderator
// (SPEC.md §8): a post on probation waits for one of them.
export async function notifyStaffOfPendingPost(
  profiles: IProfileAccessor,
  notifications: INotificationAccessor,
  postId: string,
  context: Required<Pick<RequestContext, "correlationId">>,
): Promise<PostUnavailableResponse | undefined> {
  const staff = await profiles.load(new ListStaffProfilesRequest(context));
  if (!(staff instanceof StaffProfilesLoadedResponse)) {
    return new PostUnavailableResponse(
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
      { postId },
      {},
      context,
    ),
  );
  if (!(stored instanceof NotificationsRecordedResponse)) {
    return new PostUnavailableResponse(
      context.correlationId,
      `unexpected ${stored.constructor.name} from notifications.store`,
    );
  }
  return undefined;
}
