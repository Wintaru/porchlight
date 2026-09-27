"use server";

import {
  ActionForbiddenResponse,
  CreateInviteRequest,
  InviteEndedResponse,
  InviteMadeResponse,
  InviteRejectedResponse,
  type InviteTerms,
  NoSuchInviteResponse,
  RevokeInviteRequest,
} from "@porchlight/core";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getCurrentActor } from "@/lib/current-actor";
import { getDependencyContainer } from "@/lib/dependency-container";
import { isEntityId } from "@/lib/entity-id";
import { signInPathFor } from "@/lib/sign-in-path";
import { SITE_URL } from "@/lib/site";

export type MakeInviteState =
  | { readonly kind: "idle" }
  | { readonly kind: "made"; readonly link: string }
  | { readonly kind: "error"; readonly error: string };

const TRUST_CHOICES = ["trusted", "probation"] as const;

// "" is the form's "never" and "no limit".
function optionalWhole(value: FormDataEntryValue | null): number | null | undefined {
  if (value === null || value === "") {
    return null;
  }
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : undefined;
}

function termsFrom(formData: FormData): InviteTerms | undefined {
  const expiresInDays = optionalWhole(formData.get("expiresInDays"));
  const maxUses = optionalWhole(formData.get("maxUses"));
  const trust = formData.get("trustLevel");
  const trustLevel = TRUST_CHOICES.find((choice) => choice === trust);
  if (expiresInDays === undefined || maxUses === undefined || trustLevel === undefined) {
    return undefined;
  }
  return { expiresInDays, maxUses, trustLevel };
}

// Makes an invite link (#25). The link comes back to this form's state only, like an
// agent token: a reload clears it, and nothing on the server can show it again.
export async function makeInvite(
  _previous: MakeInviteState,
  formData: FormData,
): Promise<MakeInviteState> {
  const actor = await getCurrentActor();
  if (actor.kind !== "member") {
    redirect(signInPathFor("/admin"));
  }
  const terms = termsFrom(formData);
  if (terms === undefined) {
    return { kind: "error", error: "Pick the choices from the lists." };
  }
  const response = await getDependencyContainer().accountManager.execute(
    new CreateInviteRequest(actor, terms),
  );
  if (response instanceof InviteMadeResponse) {
    // The list under the form shows the new link without a reload.
    revalidatePath("/admin");
    return { kind: "made", link: `${SITE_URL}/invite/${response.token}` };
  }
  if (response instanceof InviteRejectedResponse) {
    return { kind: "error", error: "Pick the choices from the lists." };
  }
  if (response instanceof ActionForbiddenResponse) {
    return { kind: "error", error: "Only the site's admin can make invite links." };
  }
  console.error(`invite make failed [${response.correlationId}]`, response);
  return { kind: "error", error: "The link could not be made. Try again in a moment." };
}

export async function revokeInvite(formData: FormData): Promise<void> {
  const actor = await getCurrentActor();
  if (actor.kind !== "member") {
    redirect(signInPathFor("/admin"));
  }
  const inviteId = formData.get("inviteId");
  // Not an id at all: nothing to revoke, and the store would answer a parse error.
  if (typeof inviteId !== "string" || !isEntityId(inviteId)) {
    redirect("/admin?done=revoked#invites");
  }
  const response = await getDependencyContainer().accountManager.execute(
    new RevokeInviteRequest(actor, inviteId),
  );
  if (
    response instanceof InviteEndedResponse ||
    response instanceof NoSuchInviteResponse
  ) {
    redirect("/admin?done=revoked#invites");
  }
  if (response instanceof ActionForbiddenResponse) {
    redirect("/admin?error=not-allowed");
  }
  console.error(`invite revoke failed [${response.correlationId}]`, response);
  redirect("/admin?error=unavailable");
}
