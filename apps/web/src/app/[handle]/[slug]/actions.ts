"use server";

import {
  type Actor,
  CommentDeletedResponse,
  CommentForbiddenResponse,
  CommentRejectedResponse,
  CommentResponse,
  CreateCommentRequest,
  DeleteCommentRequest,
  NoSuchCommentResponse,
  NoSuchReactionTargetResponse,
  REACTION_KINDS,
  type ReactionKind,
  type ReactionTarget,
  ReactionToggledResponse,
  ToggleReactionRequest,
} from "@porchlight/core";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getCurrentActor } from "@/lib/current-actor";
import { getDependencyContainer } from "@/lib/dependency-container";
import { isEntityId } from "@/lib/entity-id";
import { currentRequestMeta } from "@/lib/request-meta";
import { safeNextPath } from "@/lib/safe-next-path";
import { signInPathFor } from "@/lib/sign-in-path";

// The post page's Server Functions: comment, delete a comment, toggle a reaction. The
// Manager owns every rule; these parse the form, call it, and send the page back to
// itself with a code the page turns into a sentence. `returnTo` is the post's own path,
// carried on the form because a comment knows its post by id, not by URL.
//
// Every success revalidates the page before it redirects. Two replies in a row redirect
// to the same path and query with only the hash changed, and the router treats that as
// a scroll, not a navigation: without the revalidation the second reply never shows.

// The comment form and the reply forms. `parentId` is empty for a root comment.
export async function createComment(formData: FormData): Promise<void> {
  const returnTo = returnToOf(formData);
  const actor = await requireMember(returnTo);
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
  const response = await getDependencyContainer().commentManager.execute(
    new CreateCommentRequest(
      actor,
      { postId, parentId, bodyMd },
      await currentRequestMeta(),
    ),
  );
  if (!(response instanceof CommentResponse)) {
    redirect(withCode(returnTo, "error", errorCode(response)));
  }
  revalidatePath(returnTo);
  redirect(
    `${withCode(returnTo, "comment", response.comment.status)}#comment-${response.comment.id}`,
  );
}

export async function deleteComment(formData: FormData): Promise<void> {
  const returnTo = returnToOf(formData);
  const actor = await requireMember(returnTo);
  const commentId = idOf(formData, "commentId");
  if (commentId === undefined) {
    redirect(withCode(returnTo, "error", "unavailable"));
  }
  const response = await getDependencyContainer().commentManager.execute(
    new DeleteCommentRequest(actor, commentId),
  );
  if (!(response instanceof CommentDeletedResponse)) {
    redirect(withCode(returnTo, "error", errorCode(response)));
  }
  revalidatePath(returnTo);
  redirect(`${withCode(returnTo, "comment", response.outcome)}#comments`);
}

export async function toggleReaction(formData: FormData): Promise<void> {
  const returnTo = returnToOf(formData);
  const actor = await requireMember(returnTo);
  const target = targetOf(formData);
  const kind = formData.get("kind");
  if (target === undefined || typeof kind !== "string" || !isReactionKind(kind)) {
    redirect(withCode(returnTo, "error", "unavailable"));
  }
  const response = await getDependencyContainer().commentManager.execute(
    new ToggleReactionRequest(actor, target, kind),
  );
  if (!(response instanceof ReactionToggledResponse)) {
    redirect(withCode(returnTo, "error", errorCode(response)));
  }
  // No redirect: the page re-renders in place with the new count, and the reader
  // stays where they were.
  revalidatePath(returnTo);
}

// The largest comment the form accepts, before the Manager sees it. Well past what a
// reply needs; a body this long is a paste, not a comment.
const COMMENT_MAX_LENGTH = 10_000;

async function requireMember(next: string): Promise<Actor & { kind: "member" }> {
  const actor = await getCurrentActor();
  if (actor.kind !== "member") {
    redirect(signInPathFor(next));
  }
  return actor;
}

// Only a same-site path is honored, and only the path: a query string from the last
// redirect would otherwise stack notices.
function returnToOf(formData: FormData): string {
  const value = formData.get("returnTo");
  const path = safeNextPath(typeof value === "string" ? value : undefined);
  return path.split("?")[0]?.split("#")[0] ?? "/";
}

function withCode(path: string, key: string, code: string): string {
  return `${path}?${key}=${encodeURIComponent(code)}`;
}

function idOf(formData: FormData, field: string): string | undefined {
  const id = formData.get(field);
  return typeof id === "string" && isEntityId(id) ? id : undefined;
}

// A `parentId` value that is not an id never came from a reply form. Caught here, not
// in the store, so a tampered form is a form error and never a Postgres type error
// logged as an outage.
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

function targetOf(formData: FormData): ReactionTarget | undefined {
  const kind = formData.get("targetKind");
  const id = idOf(formData, "targetId");
  if (id === undefined || (kind !== "post" && kind !== "comment")) {
    return undefined;
  }
  return { kind, id };
}

function isReactionKind(value: string): value is ReactionKind {
  return REACTION_KINDS.some((kind) => kind === value);
}

// The query-string code the page turns into a sentence. Unexpected responses are
// logged with their correlation id and shown as "unavailable".
function errorCode(response: object & { readonly correlationId: string }): string {
  if (response instanceof CommentForbiddenResponse) {
    return response.reason;
  }
  if (response instanceof CommentRejectedResponse) {
    return `rejected-${response.reason}`;
  }
  if (response instanceof NoSuchCommentResponse) {
    return "no-such-comment";
  }
  if (response instanceof NoSuchReactionTargetResponse) {
    return "no-such-target";
  }
  console.error(`comment action failed [${response.correlationId}]`, response);
  return "unavailable";
}
