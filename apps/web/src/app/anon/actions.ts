"use server";

import {
  AnonymousClaimAlreadyDoneResponse,
  AnonymousClaimNotFoundResponse,
  AnonymousPostsClaimedResponse,
  ClaimAnonymousPostsRequest,
} from "@porchlight/core";
import { redirect } from "next/navigation";

import { readAnonymousSecret } from "@/lib/anonymous-cookie";
import { getCurrentActor } from "@/lib/current-actor";
import { getDependencyContainer } from "@/lib/dependency-container";
import { signInPathFor } from "@/lib/sign-in-path";

// SPEC.md §4's claim step: signed in, a member hands over the cookie (silently, if
// still carried) or a pasted code, and the Manager moves the anonymous author's posts
// and comments onto the profile.
export async function claimAnonymousPosts(formData: FormData): Promise<void> {
  const actor = await getCurrentActor();
  if (actor.kind !== "member") {
    redirect(signInPathFor("/anon"));
  }
  const pasted = formData.get("code");
  const secretOrCode =
    typeof pasted === "string" && pasted.trim() !== ""
      ? pasted
      : await readAnonymousSecret();
  if (secretOrCode === undefined) {
    redirect("/anon?claim=not-found");
  }
  const response = await getDependencyContainer().accountManager.execute(
    new ClaimAnonymousPostsRequest(actor, secretOrCode),
  );
  if (response instanceof AnonymousPostsClaimedResponse) {
    redirect("/anon?claim=claimed");
  }
  if (response instanceof AnonymousClaimAlreadyDoneResponse) {
    redirect("/anon?claim=already-done");
  }
  if (response instanceof AnonymousClaimNotFoundResponse) {
    redirect("/anon?claim=not-found");
  }
  console.error(`claim failed [${response.correlationId}]`, response);
  redirect("/anon?claim=unavailable");
}
