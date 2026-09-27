"use server";

import {
  DIGEST_SCHEDULES,
  type DigestSchedule,
  EmailSettingsResponse,
  NotificationForbiddenResponse,
  SetEmailSettingsRequest,
} from "@porchlight/core";
import { redirect } from "next/navigation";

import { getCurrentActor } from "@/lib/current-actor";
import { getDependencyContainer } from "@/lib/dependency-container";
import { signInPathFor } from "@/lib/sign-in-path";

function isDigestSchedule(value: unknown): value is DigestSchedule {
  return DIGEST_SCHEDULES.some((schedule) => schedule === value);
}

// The Email section of Settings (#22). The Manager decides who may get the queue email.
export async function saveEmailSettings(formData: FormData): Promise<void> {
  const actor = await getCurrentActor();
  if (actor.kind !== "member") {
    redirect(signInPathFor("/settings"));
  }
  const digest = formData.get("digest");
  if (!isDigestSchedule(digest)) {
    redirect("/settings?emailError=unavailable#email");
  }
  const response = await getDependencyContainer().notificationManager.execute(
    new SetEmailSettingsRequest(actor, {
      digest,
      queueImmediate: formData.get("queueImmediate") === "on",
    }),
  );
  if (response instanceof EmailSettingsResponse) {
    redirect("/settings?emailSaved=1#email");
  }
  if (response instanceof NotificationForbiddenResponse) {
    redirect("/settings?emailError=forbidden#email");
  }
  console.error(`email settings failed [${response.correlationId}]`, response);
  redirect("/settings?emailError=unavailable#email");
}
