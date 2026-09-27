import type { NotificationKind } from "./NotificationKind";

// The one sentence each notification kind reads as, in the bell and in the email digest
// (#22). Keyed by the whole NotificationKind union, so a new kind with no sentence here
// is a type error, the same guarantee EvaluatePermissionHandler's RULES record gives.
export const NOTIFICATION_SENTENCES: Readonly<Record<NotificationKind, string>> = {
  "queue.pending": "A new item is waiting for review",
  "reply.created": "Someone replied to your comment",
  "item.approved": "Your post or comment was approved",
  "item.rejected": "Your post or comment was rejected",
  "report.filed": "A new report was filed",
  "mod.action": "A moderator took action on your account",
  "post.published": "Someone you follow published a post",
};
