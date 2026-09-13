import type { INotificationAccessor } from "../../../Accessors/NotificationAccessor/INotificationAccessor";
import { ListNotificationsRequest as LoadNotificationsRequest } from "../../../Accessors/NotificationAccessor/Requests/ListNotificationsRequest";
import { NotificationsLoadedResponse } from "../../../Accessors/NotificationAccessor/Responses/NotificationsLoadedResponse";
import type { IHandler } from "../../../Common/IHandler";
import type { IPermissionEngine } from "../../../Engines/PermissionEngine/IPermissionEngine";
import { permit } from "../permit";
import type { ListNotificationsRequest } from "../Requests/ListNotificationsRequest";
import type { NotificationForbiddenResponse } from "../Responses/NotificationForbiddenResponse";
import { NotificationsResponse } from "../Responses/NotificationsResponse";
import { NotificationUnavailableResponse } from "../Responses/NotificationUnavailableResponse";
import { unavailable } from "../unavailable";

type Result =
  NotificationsResponse | NotificationForbiddenResponse | NotificationUnavailableResponse;

// A member's own list, nobody else's (SPEC.md §8).
export class ListNotificationsHandler implements IHandler<
  ListNotificationsRequest,
  Result
> {
  constructor(
    private readonly notifications: INotificationAccessor,
    private readonly permissions: IPermissionEngine,
  ) {}

  async handle(request: ListNotificationsRequest): Promise<Result> {
    const { correlationId, actor, timestamp } = request;
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

    const loaded = await this.notifications.load(
      new LoadNotificationsRequest(actor.profile.id, context),
    );
    if (loaded instanceof NotificationsLoadedResponse) {
      return new NotificationsResponse(correlationId, loaded.notifications);
    }
    return unavailable(correlationId, loaded, "notifications.load");
  }
}
