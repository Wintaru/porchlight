"use server";

import {
  AccountErasedResponse,
  ActionForbiddenResponse,
  EraseAccountRequest,
  HandleRejectedResponse,
  ProfileResponse,
  UpdateProfileRequest,
} from "@porchlight/core";
import { redirect } from "next/navigation";

import { createSessionClient } from "@/auth/session-client";
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

// The confirmed submit on the erase page (SPEC.md §10). AccountManager does the actual
// erasing in one transaction; this function's only job once that succeeds is clearing
// the now-dead session cookie, since the auth user it points at is already gone.
export async function confirmErase(formData: FormData): Promise<void> {
  const actor = await getCurrentActor();
  if (actor.kind !== "member") {
    redirect(signInPathFor("/settings/erase"));
  }
  if (formData.get("confirmed") !== "on") {
    redirect("/settings/erase?error=not-confirmed");
  }
  const response = await getDependencyContainer().accountManager.execute(
    new EraseAccountRequest(actor, actor.profile.id),
  );
  if (response instanceof AccountErasedResponse) {
    const client = await createSessionClient();
    const { error } = await client.auth.signOut();
    if (error !== null) {
      console.error("sign-out after erase failed", error);
    }
    redirect("/?erased=1");
  }
  if (response instanceof ActionForbiddenResponse) {
    redirect("/settings/erase?error=forbidden");
  }
  console.error(`account erase failed [${response.correlationId}]`, response);
  redirect("/settings/erase?error=unavailable");
}
