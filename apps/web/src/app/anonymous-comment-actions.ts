"use server";

import {
  AnonymousCommentCreatedResponse,
  CommentForbiddenResponse,
  CommentGuardRefusedResponse,
  CommentRejectedResponse,
  CreateAnonymousCommentRequest,
  VISITOR,
} from "@porchlight/core";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { flashClaimCode, setAnonymousSecretCookie } from "@/lib/anonymous-cookie";
import { currentAnonymousSubmission } from "@/lib/anonymous-submission";
import { getDependencyContainer } from "@/lib/dependency-container";
import { formatClaimCodeForDisplay } from "@/lib/format-claim-code";
import { isEntityId } from "@/lib/entity-id";
import { safeNextPath } from "@/lib/safe-next-path";

// The visitor's half of the comment form, shared by `/@handle/slug` and `/p/slug`
// (both post pages ask CommentSection to render it when `formState` is `anonymous`).
// A root comment or a reply to one (#33): the Manager checks the parent is on this
// post and visible.

const COMMENT_MAX_LENGTH = 10_000;

export async function createAnonymousComment(formData: FormData): Promise<void> {
  const returnTo = returnToOf(formData);
  const postId = idOf(formData, "postId");
  const parentId = optionalIdOf(formData.get("parentId"));
  const bodyMd = formData.get("bodyMd");
  if (postId === undefined || typeof bodyMd !== "string") {
    redirect(withCode(returnTo, "error", "unavailable"));
  }
  if (parentId === INVALID_ID) {
    redirect(withCode(returnTo, "error", "rejected-no-such-parent"));
  }
  if (bodyMd.length > COMMENT_MAX_LENGTH) {
    redirect(withCode(returnTo, "error", "too-long"));
  }
  const turnstileToken = turnstileTokenOf(formData);
  const submission = await currentAnonymousSubmission(turnstileToken);
  const response = await getDependencyContainer().commentManager.execute(
    new CreateAnonymousCommentRequest(VISITOR, { postId, parentId, bodyMd }, submission),
  );
  if (!(response instanceof AnonymousCommentCreatedResponse)) {
    redirect(withCode(returnTo, "error", errorCode(response)));
  }
  await setAnonymousSecretCookie(response.secret);
  if (response.isNewAuthor) {
    await flashClaimCode(formatClaimCodeForDisplay(response.secret));
  }
  revalidatePath(returnTo);
  redirect(
    `${withCode(returnTo, "comment", response.comment.status)}#comment-${response.comment.id}`,
  );
}

function turnstileTokenOf(formData: FormData): string | undefined {
  const value = formData.get("cf-turnstile-response");
  return typeof value === "string" && value !== "" ? value : undefined;
}

function returnToOf(formData: FormData): string {
  const value = formData.get("returnTo");
  const path = safeNextPath(typeof value === "string" ? value : undefined);
  return path.split("?")[0]?.split("#")[0] ?? "/";
}

function withCode(path: string, key: string, code: string): string {
  return `${path}?${key}=${encodeURIComponent(code)}`;
}

const INVALID_ID = Symbol("invalid parent id");

// An absent or blank parent is a root comment.
function optionalIdOf(
  value: FormDataEntryValue | null,
): string | null | typeof INVALID_ID {
  if (value === null || value === "") {
    return null;
  }
  return typeof value === "string" && isEntityId(value) ? value : INVALID_ID;
}

function idOf(formData: FormData, field: string): string | undefined {
  const id = formData.get(field);
  return typeof id === "string" && isEntityId(id) ? id : undefined;
}

function errorCode(response: object & { readonly correlationId: string }): string {
  if (response instanceof CommentForbiddenResponse) {
    return response.reason;
  }
  if (response instanceof CommentGuardRefusedResponse) {
    return "guard-refused";
  }
  if (response instanceof CommentRejectedResponse) {
    return `rejected-${response.reason}`;
  }
  console.error(`anonymous comment failed [${response.correlationId}]`, response);
  return "unavailable";
}
