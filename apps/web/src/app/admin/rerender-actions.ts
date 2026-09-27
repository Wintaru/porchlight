"use server";

import {
  CommentBodiesRerenderedResponse,
  PostBodiesRerenderedResponse,
  RerenderCommentBodiesRequest,
  RerenderPostBodiesRequest,
} from "@porchlight/core";
import { redirect } from "next/navigation";

import { getCurrentActor } from "@/lib/current-actor";
import { getDependencyContainer } from "@/lib/dependency-container";
import { signInPathFor } from "@/lib/sign-in-path";

// The Maintenance button (#77): every post's and comment's HTML rendered again from its
// markdown. Safe to press more than once: a body that is already current is not written.
export async function rerenderBodies(): Promise<void> {
  const actor = await getCurrentActor();
  if (actor.kind !== "member") {
    redirect(signInPathFor("/admin"));
  }
  const { postManager, commentManager } = getDependencyContainer();
  const posts = await postManager.execute(new RerenderPostBodiesRequest(actor));
  if (!(posts instanceof PostBodiesRerenderedResponse)) {
    console.error(`post re-render failed [${posts.correlationId}]`, posts);
    redirect("/admin?error=unavailable#maintenance");
  }
  const comments = await commentManager.execute(new RerenderCommentBodiesRequest(actor));
  if (!(comments instanceof CommentBodiesRerenderedResponse)) {
    console.error(`comment re-render failed [${comments.correlationId}]`, comments);
    redirect("/admin?error=unavailable#maintenance");
  }
  redirect(
    `/admin?done=rerendered&changed=${String(posts.changed + comments.changed)}#maintenance`,
  );
}
