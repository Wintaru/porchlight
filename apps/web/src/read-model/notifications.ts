import type { DbClient, Enums } from "@porchlight/db";

// Everything the bell renders per notification. Read under RLS
// (`notifications_recipient_read`): a member sees only their own rows.
const NOTIFICATION_COLUMNS =
  "id, kind, post_id, comment_id, report_id, payload, read_at, created_at";

const MAX_ROWS = 50;

export interface NotificationRow {
  readonly id: string;
  readonly kind: Enums<"notification_kind">;
  readonly post_id: string | null;
  readonly comment_id: string | null;
  readonly report_id: string | null;
  readonly payload: Record<string, unknown>;
  readonly read_at: string | null;
  readonly created_at: string;
}

// Newest first, like every other feed in the app (SPEC.md §8).
export async function loadNotifications(
  db: DbClient,
  recipientId: string,
): Promise<readonly NotificationRow[]> {
  const { data, error } = await db
    .from("notifications")
    .select(NOTIFICATION_COLUMNS)
    .eq("recipient_id", recipientId)
    .order("created_at", { ascending: false })
    .limit(MAX_ROWS);
  if (error) {
    throw new Error(`notifications for ${recipientId}: ${error.message}`);
  }
  return data.map((row) => ({
    ...row,
    payload:
      typeof row.payload === "object" &&
      row.payload !== null &&
      !Array.isArray(row.payload)
        ? (row.payload as Record<string, unknown>)
        : {},
  }));
}
