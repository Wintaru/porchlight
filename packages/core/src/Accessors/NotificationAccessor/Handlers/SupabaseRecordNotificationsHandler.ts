import type { DbClient, Json, TablesInsert } from "@porchlight/db";

import type { IHandler } from "../../../Common/IHandler";
import type { RecordNotificationsRequest } from "../Requests/RecordNotificationsRequest";
import { NotificationAccessFailedResponse } from "../Responses/NotificationAccessFailedResponse";
import { NotificationsRecordedResponse } from "../Responses/NotificationsRecordedResponse";

// Rows per insert: well under any request-size limit, and few round trips even for an
// author with thousands of followers.
const BATCH = 500;

export class SupabaseRecordNotificationsHandler implements IHandler<
  RecordNotificationsRequest,
  NotificationsRecordedResponse | NotificationAccessFailedResponse
> {
  constructor(private readonly db: DbClient) {}

  async handle(
    request: RecordNotificationsRequest,
  ): Promise<NotificationsRecordedResponse | NotificationAccessFailedResponse> {
    const { recipientIds, kind, target, payload, correlationId } = request;
    for (let start = 0; start < recipientIds.length; start += BATCH) {
      const rows = recipientIds
        .slice(start, start + BATCH)
        .map((recipientId): TablesInsert<"notifications"> => ({
          recipient_id: recipientId,
          kind,
          post_id: target.postId,
          payload: payload as Json,
        }));
      const { error } = await this.db.from("notifications").insert(rows);
      if (error) {
        return new NotificationAccessFailedResponse(correlationId, error.message);
      }
    }
    return new NotificationsRecordedResponse(correlationId, recipientIds.length);
  }
}
