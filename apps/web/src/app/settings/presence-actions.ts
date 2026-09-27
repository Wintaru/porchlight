"use server";

import { PresenceSettingResponse, SetPresenceSettingRequest } from "@porchlight/core";
import { redirect } from "next/navigation";

import { getCurrentActor } from "@/lib/current-actor";
import { getDependencyContainer } from "@/lib/dependency-container";
import { signInPathFor } from "@/lib/sign-in-path";

// The Presence section of Settings (#75).
export async function savePresenceSetting(formData: FormData): Promise<void> {
  const actor = await getCurrentActor();
  if (actor.kind !== "member") {
    redirect(signInPathFor("/settings"));
  }
  const response = await getDependencyContainer().accountManager.execute(
    new SetPresenceSettingRequest(actor, formData.get("showPresence") === "on"),
  );
  if (response instanceof PresenceSettingResponse) {
    redirect("/settings?presenceSaved=1#presence");
  }
  console.error(`presence setting failed [${response.correlationId}]`, response);
  redirect("/settings?error=unavailable");
}
