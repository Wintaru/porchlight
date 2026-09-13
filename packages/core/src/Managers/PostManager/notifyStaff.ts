import type { INotificationAccessor } from "../../Accessors/NotificationAccessor/INotificationAccessor";
import { RecordNotificationRequest } from "../../Accessors/NotificationAccessor/Requests/RecordNotificationRequest";
import { NotificationStoredResponse } from "../../Accessors/NotificationAccessor/Responses/NotificationStoredResponse";
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
  for (const profile of staff.profiles) {
    const stored = await notifications.store(
      new RecordNotificationRequest(profile.id, "queue.pending", { postId }, {}, context),
    );
    if (!(stored instanceof NotificationStoredResponse)) {
      return new PostUnavailableResponse(
        context.correlationId,
        `unexpected ${stored.constructor.name} from notifications.store`,
      );
    }
  }
  return undefined;
}
