import type { DbClient } from "@porchlight/db";

import type { IHandler } from "../../../Common/IHandler";
import type { ListNotificationsRequest } from "../Requests/ListNotificationsRequest";
import { NotificationAccessFailedResponse } from "../Responses/NotificationAccessFailedResponse";
import { NotificationsLoadedResponse } from "../Responses/NotificationsLoadedResponse";
import { NOTIFICATION_COLUMNS, toNotification } from "../toNotification";

// A bell's dropdown is a short recent list, not a feed (SPEC.md §8); this bound exists
// so a very active member's history degrades to "the oldest ones are missing" rather
// than an unbounded query.
const MAX_ROWS = 50;

export class SupabaseListNotificationsHandler implements IHandler<
  ListNotificationsRequest,
  NotificationsLoadedResponse | NotificationAccessFailedResponse
> {
  constructor(private readonly db: DbClient) {}

  async handle(
    request: ListNotificationsRequest,
  ): Promise<NotificationsLoadedResponse | NotificationAccessFailedResponse> {
    const { data, error } = await this.db
      .from("notifications")
      .select(NOTIFICATION_COLUMNS)
      .eq("recipient_id", request.recipientId)
      .order("created_at", { ascending: false })
      .limit(MAX_ROWS);
    if (error) {
      return new NotificationAccessFailedResponse(request.correlationId, error.message);
    }
    return new NotificationsLoadedResponse(
      request.correlationId,
      data.map(toNotification),
    );
  }
}
