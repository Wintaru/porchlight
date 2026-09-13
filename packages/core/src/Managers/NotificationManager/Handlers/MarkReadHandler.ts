import type { INotificationAccessor } from "../../../Accessors/NotificationAccessor/INotificationAccessor";
import { MarkNotificationsReadRequest } from "../../../Accessors/NotificationAccessor/Requests/MarkNotificationsReadRequest";
import { NotificationsMarkedReadResponse } from "../../../Accessors/NotificationAccessor/Responses/NotificationsMarkedReadResponse";
import type { IHandler } from "../../../Common/IHandler";
import type { IPermissionEngine } from "../../../Engines/PermissionEngine/IPermissionEngine";
import { permit } from "../permit";
import type { MarkReadRequest } from "../Requests/MarkReadRequest";
import type { NotificationForbiddenResponse } from "../Responses/NotificationForbiddenResponse";
import { NotificationsMarkedResponse } from "../Responses/NotificationsMarkedResponse";
import { NotificationUnavailableResponse } from "../Responses/NotificationUnavailableResponse";
import { unavailable } from "../unavailable";

type Result =
  | NotificationsMarkedResponse
  | NotificationForbiddenResponse
  | NotificationUnavailableResponse;

// Marks one, or every unread one, of the caller's own notifications read (SPEC.md §8).
// Scoped to the recipient at the Accessor too, so a member can never mark somebody
// else's notification by guessing its id.
export class MarkReadHandler implements IHandler<MarkReadRequest, Result> {
  constructor(
    private readonly notifications: INotificationAccessor,
    private readonly permissions: IPermissionEngine,
  ) {}

  async handle(request: MarkReadRequest): Promise<Result> {
    const { correlationId, actor, notificationId, timestamp } = request;
    const context = { correlationId, timestamp };

    const refused = await permit(
      this.permissions,
      actor,
      "notification.manage",
      { kind: "profile", id: actor.kind === "member" ? actor.profile.id : "" },
      context,
    );
    if (refused !== undefined) {
      return refused;
    }
    // `permit` above already refused a visitor; this narrows the type.
    if (actor.kind !== "member") {
      return new NotificationUnavailableResponse(
        correlationId,
        "notification.manage granted to a visitor",
      );
    }

    const marked = await this.notifications.store(
      new MarkNotificationsReadRequest(actor.profile.id, notificationId, context),
    );
    if (marked instanceof NotificationsMarkedReadResponse) {
      return new NotificationsMarkedResponse(correlationId, marked.count);
    }
    return unavailable(correlationId, marked, "notifications.store");
  }
}
