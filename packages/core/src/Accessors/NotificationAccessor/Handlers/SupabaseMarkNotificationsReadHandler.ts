import type { DbClient } from "@porchlight/db";

import type { IHandler } from "../../../Common/IHandler";
import type { MarkNotificationsReadRequest } from "../Requests/MarkNotificationsReadRequest";
import { NotificationAccessFailedResponse } from "../Responses/NotificationAccessFailedResponse";
import { NotificationsMarkedReadResponse } from "../Responses/NotificationsMarkedReadResponse";

export class SupabaseMarkNotificationsReadHandler implements IHandler<
  MarkNotificationsReadRequest,
  NotificationsMarkedReadResponse | NotificationAccessFailedResponse
> {
  constructor(private readonly db: DbClient) {}

  async handle(
    request: MarkNotificationsReadRequest,
  ): Promise<NotificationsMarkedReadResponse | NotificationAccessFailedResponse> {
    const { recipientId, notificationId, timestamp, correlationId } = request;
    let query = this.db
      .from("notifications")
      .update({ read_at: timestamp.toISOString() })
      .eq("recipient_id", recipientId)
      .is("read_at", null);
    if (notificationId !== null) {
      query = query.eq("id", notificationId);
    }
    const { data, error } = await query.select("id");
    if (error) {
      return new NotificationAccessFailedResponse(correlationId, error.message);
    }
    return new NotificationsMarkedReadResponse(correlationId, data.length);
  }
}
