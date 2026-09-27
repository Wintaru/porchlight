import type { NotificationKind } from "./NotificationKind";

// One email the sweep has claimed for a member (#22): a digest of their unread
// notifications, or the moderation-queue alert. `counts` is the unread notifications in
// the window by kind. The window is what a failed send puts back.
export interface MemberEmailClaim {
  readonly profileId: string;
  readonly email: string;
  readonly unsubscribeToken: string;
  readonly kind: "digest" | "queue";
  readonly windowStart: Date;
  readonly windowEnd: Date;
  readonly counts: Readonly<Partial<Record<NotificationKind, number>>>;
}
