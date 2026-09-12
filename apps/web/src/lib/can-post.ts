import { type Actor, CanPostResponse, CheckCanPostRequest } from "@porchlight/core";
import { cache } from "react";

import { getDependencyContainer } from "@/lib/dependency-container";

// "May this member start a post?" (D20). Deduped per request with React's `cache`:
// the header and the /write page both ask, and the answer is one site_config read.
export const canPost = cache(async (actor: Actor): Promise<boolean> => {
  if (actor.kind !== "member") {
    return false;
  }
  const response = await getDependencyContainer().postManager.query(
    new CheckCanPostRequest(actor),
  );
  return response instanceof CanPostResponse;
});
