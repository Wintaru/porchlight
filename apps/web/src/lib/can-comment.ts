import {
  type Actor,
  CanCommentResponse,
  CannotCommentResponse,
  CheckCanCommentRequest,
  CommentUnavailableResponse,
} from "@porchlight/core";

import { getDependencyContainer } from "@/lib/dependency-container";

// "May this actor comment on this post?" (D20). `open` shows the form; `signed-out`
// offers sign-in in its place; `closed` shows nothing at all, because the post's switch
// is off or the site's `comments` key is, and the reader need not be told twice.
export type CommentFormState = "open" | "signed-out" | "closed";

export async function commentFormStateFor(
  actor: Actor,
  postId: string,
): Promise<CommentFormState> {
  const response = await getDependencyContainer().commentManager.query(
    new CheckCanCommentRequest(actor, postId),
  );
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
