"use server";

import { MarkReadRequest, NotificationsMarkedResponse } from "@porchlight/core";

import { createSessionClient } from "@/auth/session-client";
import { getCurrentActor } from "@/lib/current-actor";
import { getDependencyContainer } from "@/lib/dependency-container";
import { isEntityId } from "@/lib/entity-id";
import { notificationDestination } from "@/read-model/notification-destination";

// The bell's own actions (SPEC.md §8): mark one notification read on click, or every
// unread one from the dropdown's "mark all read". NotificationManager owns the rule
// that a member marks only their own; these only parse the call and report ok/not.

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

// A click on a bell item (#109): marks it read and answers where it leads, or null when
// it leads nowhere a member can open.
export async function openNotification(notificationId: string): Promise<string | null> {
  const actor = await getCurrentActor();
  if (actor.kind !== "member" || !isEntityId(notificationId)) {
    return null;
  }
  const marked = await getDependencyContainer().notificationManager.execute(
    new MarkReadRequest(actor, notificationId),
  );
  if (!(marked instanceof NotificationsMarkedResponse)) {
    console.error(`notification ${notificationId} not marked read`, marked);
  }
  try {
    return await notificationDestination(
      await createSessionClient(),
      actor.profile.id,
      notificationId,
    );
  } catch (error: unknown) {
    console.error(`notification ${notificationId} destination failed`, error);
    return null;
  }
}
