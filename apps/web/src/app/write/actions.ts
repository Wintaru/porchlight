"use server";

import {
  type Actor,
  CreateDraftRequest,
  DeletePostRequest,
  type Post,
  PostDeletedResponse,
  PostForbiddenResponse,
  PostNotPublishableResponse,
  PostRejectedResponse,
  PostResponse,
  PublishPostRequest,
  UnpublishPostRequest,
  UpdateDraftRequest,
} from "@porchlight/core";
import { redirect } from "next/navigation";

import { getCurrentActor } from "@/lib/current-actor";
import { getDependencyContainer } from "@/lib/dependency-container";
import { signInPathFor } from "@/lib/sign-in-path";
import { isPostId } from "@/lib/post-id";
import { parseIntent, parsePostForm } from "./parse-post-form";

// The editor's Server Functions. The Manager owns every rule (who may write, what a
// slug is, where a post lands on publish); these parse the form, call it, and map the
// response to a redirect the page can show. Unstyled and plain until #6 lands Tiptap.

export async function createPost(formData: FormData): Promise<void> {
  const actor = await requireMember("/write");
  const parsed = parsePostForm(formData);
  if (!parsed.ok) {
    redirect(`/write?error=${parsed.error}`);
  }
  const response = await getDependencyContainer().postManager.execute(
    new CreateDraftRequest(actor, parsed.draft),
  );
  if (!(response instanceof PostResponse)) {
    redirect(`/write?error=${errorCode(response)}`);
  }
  if (parseIntent(formData) === "publish") {
    await publish(actor, response.post);
  }
  redirect(`/write/${response.post.id}?saved=draft`);
}

export async function savePost(formData: FormData): Promise<void> {
  const postId = idOf(formData);
  const actor = await requireMember(`/write/${postId}`);
  const parsed = parsePostForm(formData);
  if (!parsed.ok) {
    redirect(`/write/${postId}?error=${parsed.error}`);
  }
  const response = await getDependencyContainer().postManager.execute(
    new UpdateDraftRequest(actor, postId, parsed.draft),
  );
  if (!(response instanceof PostResponse)) {
    redirect(`/write/${postId}?error=${errorCode(response)}`);
  }
  if (parseIntent(formData) === "publish") {
    await publish(actor, response.post);
  }
  redirect(`/write/${postId}?saved=draft`);
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
  const id = formData.get("postId");
  if (typeof id !== "string" || !isPostId(id)) {
    redirect("/write?error=unavailable");
  }
  return id;
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
