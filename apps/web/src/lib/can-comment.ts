import {
  type Actor,
  CanCommentResponse,
  CannotCommentResponse,
  CheckCanCommentAnonymouslyRequest,
  CheckCanCommentRequest,
  CommentUnavailableResponse,
} from "@porchlight/core";

import { getDependencyContainer } from "@/lib/dependency-container";

// "May this actor comment on this post?" (D20). `open` shows the member form,
// `anonymous` shows the visitor form, `signed-out` offers sign-in in its place,
// `closed` shows nothing at all, because the post's switch is off or the site's
// `comments` key is, and the reader need not be told twice.
export type CommentFormState = "open" | "anonymous" | "signed-out" | "closed";

export async function commentFormStateFor(
  actor: Actor,
  postId: string,
): Promise<CommentFormState> {
  const { commentManager } = getDependencyContainer();
  if (actor.kind === "visitor") {
    const response = await commentManager.query(
      new CheckCanCommentAnonymouslyRequest(actor, postId),
    );
    if (response instanceof CanCommentResponse) {
      return "anonymous";
    }
    if (response instanceof CannotCommentResponse) {
      // Never `signed-out` in practice (the actor already is a visitor): whatever
      // closed the anonymous door, sign-in is still the way in for a member.
      return "signed-out";
    }
    if (response instanceof CommentUnavailableResponse) {
      console.error(`comment check failed [${response.correlationId}]`, response.reason);
    }
    return "closed";
  }
  const response = await commentManager.query(new CheckCanCommentRequest(actor, postId));
  if (response instanceof CanCommentResponse) {
    return "open";
  }
  if (response instanceof CannotCommentResponse) {
    return response.reason === "signed-out" ? "signed-out" : "closed";
  }
  if (response instanceof CommentUnavailableResponse) {
    console.error(`comment check failed [${response.correlationId}]`, response.reason);
  }
  return "closed";
}
