import type { Json, Tables } from "@porchlight/db";

import type { Notification } from "../../Common/Notification";

// Never `select *`: the columns here are the ones the mapper below expects.
export const NOTIFICATION_COLUMNS =
  "id, recipient_id, kind, post_id, comment_id, report_id, payload, read_at, created_at";

export type NotificationRow = Pick<
  Tables<"notifications">,
  | "id"
  | "recipient_id"
  | "kind"
  | "post_id"
  | "comment_id"
  | "report_id"
  | "payload"
  | "read_at"
  | "created_at"
>;

// The domain union in Common restates the schema's enum, because Common cannot import
// packages/db. toNotification.test.ts checks the domain union against the generated
// constant, so a value added on either side without the other fails the gate.
export function toNotification(row: NotificationRow): Notification {
  return {
    id: row.id,
    recipientId: row.recipient_id,
    kind: row.kind,
    postId: row.post_id,
    commentId: row.comment_id,
    reportId: row.report_id,
    payload: toPayload(row.payload),
    readAt: row.read_at === null ? null : new Date(row.read_at),
    createdAt: new Date(row.created_at),
  };
}

function toPayload(payload: Json): Record<string, unknown> {
  return typeof payload === "object" && payload !== null && !Array.isArray(payload)
    ? payload
    : {};
}
