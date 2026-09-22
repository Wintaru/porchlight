import type { Actor } from "../../Common/Actor";
import type { NewPost } from "../../Accessors/PostAccessor/NewPost";

// Where a new post comes from (SPEC.md §17, D22). An agent's draft names its token and
// starts unreviewed; a person's post is reviewed as it is written, because the person
// wrote it. The author is the member either way: an agent acts as its member, and a
// post never belongs to a token.
export function provenanceOf(
  actor: Extract<Actor, { kind: "member" | "agent" }>,
  now: Date,
): Pick<NewPost, "origin" | "agentTokenId" | "reviewedAt"> {
  return actor.kind === "agent"
    ? { origin: "agent", agentTokenId: actor.grant.tokenId, reviewedAt: null }
    : { origin: "editor", agentTokenId: null, reviewedAt: now };
}

// A save or a publish by a signed-in member marks the post reviewed (D22). An agent's
// own save never does, so the badge stays until a person opens the draft. An anonymous
// author never reaches here: their one write sets the stamp directly.
export function reviewStamp(actor: Actor, now: Date): { reviewedAt?: Date } {
  return actor.kind === "member" ? { reviewedAt: now } : {};
}
