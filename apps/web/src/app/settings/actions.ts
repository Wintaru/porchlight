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
import type { SubmitRefused } from "@/components/KeepTypedForm";
import { signInPathFor } from "@/lib/sign-in-path";
import { parseProfileForm } from "./parse-profile-form";

// Saves the Profile section of the Settings board. The Manager owns the rules (who may
// edit, what a handle may be); this function only parses the form and maps the response
// to an error code the page can show. The form's own action, for a browser without JS.
export async function saveProfile(formData: FormData): Promise<void> {
  const refused = await profileSave(formData);
  redirect(`/settings?error=${refused.error}`);
}

// The same save with JS: a refusal comes back to the page, which keeps what was typed.
export async function saveProfileInPlace(formData: FormData): Promise<SubmitRefused> {
  return profileSave(formData);
}

// A stored save redirects; only a refusal returns.
async function profileSave(formData: FormData): Promise<SubmitRefused> {
  const actor = await getCurrentActor();
  if (actor.kind !== "member") {
    redirect(signInPathFor("/settings"));
  }
  const parsed = parseProfileForm(formData);
  if (!parsed.ok) {
    return { error: parsed.error };
  }
  const response = await getDependencyContainer().accountManager.execute(
    new UpdateProfileRequest(actor, actor.profile.id, parsed.changes),
  );
  if (response instanceof ProfileResponse) {
    redirect("/settings?saved=1");
  }
  if (response instanceof HandleRejectedResponse) {
    return { error: `handle-${response.reason}` };
  }
  if (response instanceof ActionForbiddenResponse) {
    return { error: "forbidden" };
  }
  console.error(`profile update failed [${response.correlationId}]`, response);
  return { error: "unavailable" };
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
