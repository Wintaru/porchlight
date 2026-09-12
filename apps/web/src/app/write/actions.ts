"use server";

import {
  type Actor,
  CreateDraftRequest,
  DeletePostRequest,
  type Post,
  PostDeletedResponse,
  PostForbiddenResponse,
  PostNotPublishableResponse,
  PostPreviewResponse,
  PostRejectedResponse,
  PostResponse,
  PreviewPostRequest,
  PublishPostRequest,
  UnpublishPostRequest,
  UpdateDraftRequest,
} from "@porchlight/core";
import { redirect } from "next/navigation";

import { getCurrentActor } from "@/lib/current-actor";
import { getDependencyContainer } from "@/lib/dependency-container";
import { signInPathFor } from "@/lib/sign-in-path";
import { isPostId } from "@/lib/post-id";
import type { AutosaveResult, PreviewResult } from "./editor-results";
import { BODY_MAX_LENGTH, parseIntent, parsePostForm } from "./parse-post-form";

// The editor's Server Functions. The Manager owns every rule (who may write, what a
// slug is, where a post lands on publish); these parse the form, call it, and map the
// response to a redirect the page can show, or to a result the editor shows in place.

// Save draft and Publish. One function for a new post and an existing one: autosave can
// create the draft under the new-post page, after which the page's own buttons carry
// the id and must update, not create again.
export async function submitPost(formData: FormData): Promise<void> {
  const postId = optionalIdOf(formData);
  if (postId === INVALID_ID) {
    redirect("/write?error=unavailable");
  }
  const returnTo = postId === undefined ? "/write" : `/write/${postId}`;
  const actor = await requireMember(returnTo);
  const parsed = parsePostForm(formData);
  if (!parsed.ok) {
    redirect(`${returnTo}?error=${parsed.error}`);
  }
  const response = await getDependencyContainer().postManager.execute(
    postId === undefined
      ? new CreateDraftRequest(actor, parsed.draft)
      : new UpdateDraftRequest(actor, postId, parsed.draft),
  );
  if (!(response instanceof PostResponse)) {
    redirect(`${returnTo}?error=${errorCode(response)}`);
  }
  if (parseIntent(formData) === "publish") {
    await publish(actor, response.post);
  }
  redirect(`/write/${response.post.id}?saved=draft`);
}

// The editor's timer. Same parse and the same Manager calls as a save, but the answer
// comes back to the page instead of moving it: a redirect from a background call would
// unmount the editor and drop what was typed. Never publishes.
export async function autosavePost(formData: FormData): Promise<AutosaveResult> {
  const actor = await getCurrentActor();
  if (actor.kind !== "member") {
    return { ok: false, error: "signed-out" };
  }
  const postId = optionalIdOf(formData);
  if (postId === INVALID_ID) {
    return { ok: false, error: "unavailable" };
  }
  const parsed = parsePostForm(formData);
  if (!parsed.ok) {
    return { ok: false, error: parsed.error };
  }
  const response = await getDependencyContainer().postManager.execute(
    postId === undefined
      ? new CreateDraftRequest(actor, parsed.draft)
      : new UpdateDraftRequest(actor, postId, parsed.draft),
  );
  if (!(response instanceof PostResponse)) {
    return { ok: false, error: errorCode(response) };
  }
  return { ok: true, postId: response.post.id };
}

// The Preview button: the body as the page will render it, through the one render path
// (D3). Nothing is stored.
export async function previewPost(bodyMd: unknown): Promise<PreviewResult> {
  // A Server Function argument is client input: check it as the form parser would.
  if (typeof bodyMd !== "string" || bodyMd.length > BODY_MAX_LENGTH) {
    return { ok: false };
  }
  const actor = await getCurrentActor();
  if (actor.kind !== "member") {
    return { ok: false };
  }
  const response = await getDependencyContainer().postManager.query(
    new PreviewPostRequest(bodyMd),
  );
  if (!(response instanceof PostPreviewResponse)) {
    console.error(`post preview failed [${response.correlationId}]`, response);
    return { ok: false };
  }
  return { ok: true, bodyHtml: response.bodyHtml };
}

export async function unpublishPost(formData: FormData): Promise<void> {
  const postId = idOf(formData);
  const actor = await requireMember(`/write/${postId}`);
  const response = await getDependencyContainer().postManager.execute(
    new UnpublishPostRequest(actor, postId),
  );
  if (!(response instanceof PostResponse)) {
    redirect(`/write/${postId}?error=${errorCode(response)}`);
  }
  redirect(`/write/${postId}?saved=unpublished`);
}

export async function deletePost(formData: FormData): Promise<void> {
  const postId = idOf(formData);
  const actor = await requireMember(`/write/${postId}`);
  const response = await getDependencyContainer().postManager.execute(
    new DeletePostRequest(actor, postId),
  );
  if (!(response instanceof PostDeletedResponse)) {
    redirect(`/write/${postId}?error=${errorCode(response)}`);
  }
  redirect("/write?deleted=1");
}

// Publish lands on the live page when it went straight up, and back on the editor
// with a note when it went to the queue (D7). Never returns: every path redirects.
async function publish(actor: Actor & { kind: "member" }, post: Post): Promise<never> {
  const response = await getDependencyContainer().postManager.execute(
    new PublishPostRequest(actor, post.id),
  );
  if (!(response instanceof PostResponse)) {
    redirect(`/write/${post.id}?error=${errorCode(response)}`);
  }
  if (response.post.status === "published") {
    redirect(`/@${actor.profile.handle}/${response.post.slug}`);
  }
  redirect(`/write/${post.id}?saved=${response.post.status}`);
}

async function requireMember(next: string): Promise<Actor & { kind: "member" }> {
  const actor = await getCurrentActor();
  if (actor.kind !== "member") {
    redirect(signInPathFor(next));
  }
  return actor;
}

function idOf(formData: FormData): string {
  const id = optionalIdOf(formData);
  if (id === undefined || id === INVALID_ID) {
    redirect("/write?error=unavailable");
  }
  return id;
}

// A `postId` value that is not an id never came from the editor.
const INVALID_ID = Symbol("invalid post id");

// No id means a new post.
function optionalIdOf(formData: FormData): string | undefined | typeof INVALID_ID {
  const id = formData.get("postId");
  if (id === null || id === "") {
    return undefined;
  }
  return typeof id === "string" && isPostId(id) ? id : INVALID_ID;
}

// The query-string code the page turns into a sentence. Unexpected responses are
// logged with their correlation id and shown as "unavailable".
function errorCode(response: object & { readonly correlationId: string }): string {
  if (response instanceof PostForbiddenResponse) {
    return response.reason;
  }
  if (response instanceof PostRejectedResponse) {
    return `rejected-${response.reason}`;
  }
  if (response instanceof PostNotPublishableResponse) {
    return `not-publishable-${response.status}`;
  }
  console.error(`post action failed [${response.correlationId}]`, response);
  return "unavailable";
}
