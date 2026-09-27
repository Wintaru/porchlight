import type { Json } from "@porchlight/db";

import type { MemberEmailClaim } from "../../Common/MemberEmailClaim";
import { NOTIFICATION_KINDS, type NotificationKind } from "../../Common/NotificationKind";

export interface MemberEmailClaimRow {
  readonly profile_id: string;
  readonly email: string;
  readonly unsubscribe_token: string;
  readonly kind: string;
  readonly window_start: string;
  readonly window_end: string;
  readonly counts: Json;
}

function isNotificationKind(value: string): value is NotificationKind {
  return NOTIFICATION_KINDS.some((kind) => kind === value);
}

// A row from `claim_member_emails`. `kind` is text in SQL, and `counts` is jsonb, so both
// are checked here: an unknown kind or a count that is not a number is dropped, never
// passed on as something the email would print.
export function toMemberEmailClaim(row: MemberEmailClaimRow): MemberEmailClaim | null {
  if (row.kind !== "digest" && row.kind !== "queue") {
    return null;
  }
  const counts: Partial<Record<NotificationKind, number>> = {};
  if (
    typeof row.counts === "object" &&
    row.counts !== null &&
    !Array.isArray(row.counts)
  ) {
    for (const [kind, count] of Object.entries(row.counts)) {
      if (isNotificationKind(kind) && typeof count === "number" && count > 0) {
        counts[kind] = count;
      }
    }
  }
  return {
    profileId: row.profile_id,
    email: row.email,
    unsubscribeToken: row.unsubscribe_token,
    kind: row.kind,
    windowStart: new Date(row.window_start),
    windowEnd: new Date(row.window_end),
    counts,
  };
}
