import { Constants } from "@porchlight/db";
import { expect, test } from "vitest";

import { NOTIFICATION_KINDS } from "../../Common/NotificationKind";
import { toNotification } from "./toNotification";

// toNotification's field assignments prove every schema value is in the domain union.
// This proves the reverse, so the two sets are equal, not merely overlapping.
test("the domain notification kind union matches the schema enum", () => {
  expect([...NOTIFICATION_KINDS].sort()).toEqual(
    [...Constants.public.Enums.notification_kind].sort(),
  );
});

test("toNotification maps an unread reply notification", () => {
  const notification = toNotification({
    id: "n1",
    recipient_id: "u1",
    kind: "reply.created",
    post_id: "p1",
    comment_id: "c1",
    report_id: null,
    payload: {},
    read_at: null,
    created_at: "2026-09-12T10:00:00.000Z",
  });
  expect(notification).toEqual({
    id: "n1",
    recipientId: "u1",
    kind: "reply.created",
    postId: "p1",
    commentId: "c1",
    reportId: null,
    payload: {},
    readAt: null,
    createdAt: new Date("2026-09-12T10:00:00.000Z"),
  });
});

test("toNotification maps a read notification with a payload", () => {
  const notification = toNotification({
    id: "n2",
    recipient_id: "u2",
    kind: "item.rejected",
    post_id: "p2",
    comment_id: null,
    report_id: null,
    payload: { reason: "off-topic" },
    read_at: "2026-09-12T11:00:00.000Z",
    created_at: "2026-09-12T10:00:00.000Z",
  });
  expect(notification.readAt).toEqual(new Date("2026-09-12T11:00:00.000Z"));
  expect(notification.payload).toEqual({ reason: "off-topic" });
});
