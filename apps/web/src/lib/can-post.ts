import {
  type Actor,
  CanPostResponse,
  CheckCanPostAnonymouslyRequest,
  CheckCanPostRequest,
} from "@porchlight/core";
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

// The visitor entry point #8 adds: "may an anonymous write start here" (D20). The
// header asks this for a visitor the same way `canPost` asks for a member.
export const canPostAnonymously = cache(async (actor: Actor): Promise<boolean> => {
  if (actor.kind !== "visitor") {
    return false;
  }
  const response = await getDependencyContainer().postManager.query(
    new CheckCanPostAnonymouslyRequest(actor),
  );
  return response instanceof CanPostResponse;
});
