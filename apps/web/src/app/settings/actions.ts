"use server";

import {
  ActionForbiddenResponse,
  HandleRejectedResponse,
  ProfileResponse,
  UpdateProfileRequest,
} from "@porchlight/core";
import { redirect } from "next/navigation";

import { getCurrentActor } from "@/lib/current-actor";
import { getDependencyContainer } from "@/lib/dependency-container";
import { signInPathFor } from "@/lib/sign-in-path";
import { parseProfileForm } from "./parse-profile-form";

// Saves the Profile section of the Settings board. The Manager owns the rules (who may
// edit, what a handle may be); this function only parses the form and maps the response
// to a query string the page can show.
export async function saveProfile(formData: FormData): Promise<void> {
  const actor = await getCurrentActor();
  if (actor.kind !== "member") {
    redirect(signInPathFor("/settings"));
  }
  const parsed = parseProfileForm(formData);
  if (!parsed.ok) {
    redirect(`/settings?error=${parsed.error}`);
  }
  const response = await getDependencyContainer().accountManager.execute(
    new UpdateProfileRequest(actor, actor.profile.id, parsed.changes),
  );
  if (response instanceof ProfileResponse) {
    redirect("/settings?saved=1");
  }
  if (response instanceof HandleRejectedResponse) {
    redirect(`/settings?error=handle-${response.reason}`);
  }
  if (response instanceof ActionForbiddenResponse) {
    redirect("/settings?error=forbidden");
  }
  console.error(`profile update failed [${response.correlationId}]`, response);
  redirect("/settings?error=unavailable");
}
