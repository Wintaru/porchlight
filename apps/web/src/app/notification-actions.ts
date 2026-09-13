"use server";

import { MarkReadRequest, NotificationsMarkedResponse } from "@porchlight/core";

import { getCurrentActor } from "@/lib/current-actor";
import { getDependencyContainer } from "@/lib/dependency-container";
import { isEntityId } from "@/lib/entity-id";

// The bell's own actions (SPEC.md §8): mark one notification read on click, or every
// unread one from the dropdown's "mark all read". NotificationManager owns the rule
// that a member marks only their own; these only parse the call and report ok/not.

export async function markNotificationRead(notificationId: string): Promise<boolean> {
  const actor = await getCurrentActor();
  if (actor.kind !== "member" || !isEntityId(notificationId)) {
    return false;
  }
  const response = await getDependencyContainer().notificationManager.execute(
    new MarkReadRequest(actor, notificationId),
  );
  return response instanceof NotificationsMarkedResponse;
}

export async function markAllNotificationsRead(): Promise<boolean> {
  const actor = await getCurrentActor();
  if (actor.kind !== "member") {
    return false;
  }
  const response = await getDependencyContainer().notificationManager.execute(
    new MarkReadRequest(actor, null),
  );
  return response instanceof NotificationsMarkedResponse;
}
