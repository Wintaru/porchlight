import type { NotificationKind } from "./NotificationKind";

// A notification as every layer sees it (SPEC.md §8). `postId`/`commentId`/`reportId`
// name what it is about; a kind that is about none of the three (there is none today,
// but the shape allows it) leaves all three null. `payload` carries kind-specific
// display data (a reason, an action name) too small and varied to earn its own columns.
export interface Notification {
  readonly id: string;
  readonly recipientId: string;
  readonly kind: NotificationKind;
  readonly postId: string | null;
  readonly commentId: string | null;
  readonly reportId: string | null;
  readonly payload: Record<string, unknown>;
  readonly readAt: Date | null;
  readonly createdAt: Date;
}
