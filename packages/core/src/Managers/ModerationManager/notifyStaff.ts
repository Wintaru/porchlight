import type { INotificationAccessor } from "../../Accessors/NotificationAccessor/INotificationAccessor";
import { RecordNotificationRequest } from "../../Accessors/NotificationAccessor/Requests/RecordNotificationRequest";
import { NotificationStoredResponse } from "../../Accessors/NotificationAccessor/Responses/NotificationStoredResponse";
import type { IProfileAccessor } from "../../Accessors/ProfileAccessor/IProfileAccessor";
import { ListStaffProfilesRequest } from "../../Accessors/ProfileAccessor/Requests/ListStaffProfilesRequest";
import { StaffProfilesLoadedResponse } from "../../Accessors/ProfileAccessor/Responses/StaffProfilesLoadedResponse";
import type { NotificationKind } from "../../Common/NotificationKind";
import type { RequestContext } from "../../Common/RequestContext";
import { ModerationUnavailableResponse } from "./Responses/ModerationUnavailableResponse";

// Fans a notification out to every active admin and moderator (SPEC.md §8): who
// `queue.pending` and `report.filed` are for.
export async function notifyStaff(
  profiles: IProfileAccessor,
  notifications: INotificationAccessor,
  kind: NotificationKind,
  target: {
    readonly postId?: string;
    readonly commentId?: string;
    readonly reportId?: string;
  },
  payload: Record<string, unknown>,
  context: Required<Pick<RequestContext, "correlationId">>,
): Promise<ModerationUnavailableResponse | undefined> {
  const staff = await profiles.load(new ListStaffProfilesRequest(context));
  if (!(staff instanceof StaffProfilesLoadedResponse)) {
    return new ModerationUnavailableResponse(
      context.correlationId,
      "reason" in staff && typeof staff.reason === "string"
        ? staff.reason
        : `unexpected ${staff.constructor.name} from profiles.load`,
    );
  }
  for (const profile of staff.profiles) {
    const stored = await notifications.store(
      new RecordNotificationRequest(profile.id, kind, target, payload, context),
    );
    if (!(stored instanceof NotificationStoredResponse)) {
      return new ModerationUnavailableResponse(
        context.correlationId,
        "reason" in stored && typeof stored.reason === "string"
          ? stored.reason
          : `unexpected ${stored.constructor.name} from notifications.store`,
      );
    }
  }
  return undefined;
}
