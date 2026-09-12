"use server";

import {
  AnonymousPostCreatedResponse,
  CreateAnonymousPostRequest,
  PostForbiddenResponse,
  PostGuardRefusedResponse,
  PostRejectedResponse,
  VISITOR,
} from "@porchlight/core";
import { redirect } from "next/navigation";

import { flashClaimCode, setAnonymousSecretCookie } from "@/lib/anonymous-cookie";
import { currentAnonymousSubmission } from "@/lib/anonymous-submission";
import { getDependencyContainer } from "@/lib/dependency-container";
import { formatClaimCodeForDisplay } from "@/lib/format-claim-code";
import { parseAnonymousPostForm } from "./parse-anonymous-post-form";

// The anonymous form's one Server Function (SPEC.md §4): no draft phase, no sign-in —
// a visitor writes and the post lands `pending`. On success the visitor's identity
// cookie is set (or renewed) and, on a first-ever write, the claim code is flashed once
// for the destination page to show.
export async function submitAnonymousPost(formData: FormData): Promise<void> {
  const parsed = parseAnonymousPostForm(formData);
  if (!parsed.ok) {
    redirect(`/p/new?error=${parsed.error}`);
  }
  const submission = await currentAnonymousSubmission(turnstileTokenOf(formData));
  const response = await getDependencyContainer().postManager.execute(
    new CreateAnonymousPostRequest(VISITOR, parsed.draft, submission),
  );
  if (!(response instanceof AnonymousPostCreatedResponse)) {
    redirect(`/p/new?error=${errorCode(response)}`);
  }
  await setAnonymousSecretCookie(response.secret);
  if (response.isNewAuthor) {
    await flashClaimCode(formatClaimCodeForDisplay(response.secret));
  }
  // Not `/p/<slug>`: nothing anonymous is visible under RLS before an admin approves
  // it (SPEC.md §4), not even to the author who just wrote it. The status page is
  // where a pending post actually shows something.
  redirect("/anon");
}

function turnstileTokenOf(formData: FormData): string | undefined {
  const value = formData.get("cf-turnstile-response");
  return typeof value === "string" && value !== "" ? value : undefined;
}

// The query-string code the page turns into a sentence. Unexpected responses are
// logged with their correlation id and shown as "unavailable".
function errorCode(response: object & { readonly correlationId: string }): string {
  if (response instanceof PostForbiddenResponse) {
    return response.reason;
  }
  if (response instanceof PostGuardRefusedResponse) {
    return "guard-refused";
  }
  if (response instanceof PostRejectedResponse) {
    return `rejected-${response.reason}`;
  }
  console.error(`anonymous post failed [${response.correlationId}]`, response);
  return "unavailable";
}
