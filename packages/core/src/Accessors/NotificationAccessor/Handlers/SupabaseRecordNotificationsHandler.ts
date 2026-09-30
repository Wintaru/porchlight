import type { DbClient, Json, TablesInsert } from "@porchlight/db";

import type { IHandler } from "../../../Common/IHandler";
import type { RecordNotificationsRequest } from "../Requests/RecordNotificationsRequest";
import { NotificationAccessFailedResponse } from "../Responses/NotificationAccessFailedResponse";
import { NotificationsRecordedResponse } from "../Responses/NotificationsRecordedResponse";

export class SupabaseRecordNotificationsHandler implements IHandler<
  RecordNotificationsRequest,
  NotificationsRecordedResponse | NotificationAccessFailedResponse
> {
  constructor(private readonly db: DbClient) {}

  async handle(
    request: RecordNotificationsRequest,
  ): Promise<NotificationsRecordedResponse | NotificationAccessFailedResponse> {
    const { recipientIds, kind, target, payload, correlationId } = request;
    if (recipientIds.length === 0) {
      return new NotificationsRecordedResponse(correlationId, 0);
    }
    const rows: TablesInsert<"notifications">[] = recipientIds.map((recipientId) => ({
      recipient_id: recipientId,
      kind,
      post_id: target.postId ?? null,
      comment_id: target.commentId ?? null,
      report_id: target.reportId ?? null,
      payload: payload as Json,
    }));
    const { error } = await this.db.from("notifications").insert(rows);
    if (error) {
      return new NotificationAccessFailedResponse(correlationId, error.message);
    }
    return new NotificationsRecordedResponse(correlationId, rows.length);
  }
}
