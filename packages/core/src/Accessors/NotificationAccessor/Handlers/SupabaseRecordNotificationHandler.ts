import type { DbClient, Json, TablesInsert } from "@porchlight/db";

import type { IHandler } from "../../../Common/IHandler";
import type { RecordNotificationRequest } from "../Requests/RecordNotificationRequest";
import { NotificationAccessFailedResponse } from "../Responses/NotificationAccessFailedResponse";
import { NotificationStoredResponse } from "../Responses/NotificationStoredResponse";
import { NOTIFICATION_COLUMNS, toNotification } from "../toNotification";

export class SupabaseRecordNotificationHandler implements IHandler<
  RecordNotificationRequest,
  NotificationStoredResponse | NotificationAccessFailedResponse
> {
  constructor(private readonly db: DbClient) {}

  async handle(
    request: RecordNotificationRequest,
  ): Promise<NotificationStoredResponse | NotificationAccessFailedResponse> {
    const { recipientId, kind, target, payload, correlationId } = request;
    const row: TablesInsert<"notifications"> = {
      recipient_id: recipientId,
      kind,
      post_id: target.postId ?? null,
      comment_id: target.commentId ?? null,
      report_id: target.reportId ?? null,
      payload: payload as Json,
    };
    const { data, error } = await this.db
      .from("notifications")
      .insert(row)
      .select(NOTIFICATION_COLUMNS)
      .single();
    if (error) {
      return new NotificationAccessFailedResponse(correlationId, error.message);
    }
    return new NotificationStoredResponse(correlationId, toNotification(data));
  }
}
