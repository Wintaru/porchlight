"use server";

import {
  CommentBodiesRerenderedResponse,
  CommentRerenderRejectedResponse,
  PostBodiesRerenderedResponse,
  PostRerenderRejectedResponse,
  RERENDER_BODIES_PER_PRESS,
  RerenderCommentBodiesRequest,
  RerenderPostBodiesRequest,
  type ResponseBase,
} from "@porchlight/core";
import { redirect } from "next/navigation";

import { getCurrentActor } from "@/lib/current-actor";
import { getDependencyContainer } from "@/lib/dependency-container";
import { signInPathFor } from "@/lib/sign-in-path";
import {
  parseRerenderCursor,
  rerenderPress,
  type TableRunResult,
} from "./rerender-press";

// The Maintenance button (#77): every post's and comment's HTML rendered again from its
// markdown. Safe to press more than once: a body that is already current is not written.
// One press renders about RERENDER_BODIES_PER_PRESS bodies (#98, C24). A larger site
// stops part way, and the page offers Continue with the cursor in the form.
export async function rerenderBodies(formData: FormData): Promise<void> {
  const actor = await getCurrentActor();
  if (actor.kind !== "member") {
    redirect(signInPathFor("/admin"));
  }
  const cursor = parseRerenderCursor(formData.get("table"), formData.get("after"));
  if (cursor === undefined) {
    redirect("/admin?error=rerender-cursor#maintenance");
  }
  const { postManager, commentManager } = getDependencyContainer();
  const outcome = await rerenderPress(cursor, RERENDER_BODIES_PER_PRESS, {
    posts: async (afterId, maxBodies) =>
      tableResult(
        "post",
        await postManager.execute(
          new RerenderPostBodiesRequest(actor, afterId, maxBodies),
        ),
      ),
    comments: async (afterId, maxBodies) =>
      tableResult(
        "comment",
        await commentManager.execute(
          new RerenderCommentBodiesRequest(actor, afterId, maxBodies),
        ),
      ),
  });
  if (outcome.kind === "rejected") {
    redirect("/admin?error=rerender-cursor#maintenance");
  }
  if (outcome.kind === "failed") {
    redirect("/admin?error=unavailable#maintenance");
  }
  const counts = `changed=${String(outcome.changed)}&skipped=${String(outcome.skipped)}`;
  if (outcome.kind === "done") {
    redirect(`/admin?done=rerendered&${counts}#maintenance`);
  }
  const next = new URLSearchParams({ table: outcome.next.table });
  if (outcome.next.afterId !== null) {
    next.set("after", outcome.next.afterId);
  }
  redirect(`/admin?done=rerender-stopped&${counts}&${next.toString()}#maintenance`);
}

function tableResult(table: string, response: ResponseBase): TableRunResult {
  if (
    response instanceof PostBodiesRerenderedResponse ||
    response instanceof CommentBodiesRerenderedResponse
  ) {
    return response;
  }
  if (
    response instanceof PostRerenderRejectedResponse ||
    response instanceof CommentRerenderRejectedResponse
  ) {
    return "rejected";
  }
  console.error(`${table} re-render failed [${response.correlationId}]`, response);
  return "failed";
}
