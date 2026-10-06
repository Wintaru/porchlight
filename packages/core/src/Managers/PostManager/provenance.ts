import type { Actor } from "../../Common/Actor";
import type { NewPost } from "../../Accessors/PostAccessor/NewPost";
import type { Post } from "../../Common/Post";

// Where a new post comes from (SPEC.md §17, D22). An agent's draft names its token and
// starts unreviewed; a person's post is reviewed as it is written, because the person
// wrote it. The author is the member either way: an agent acts as its member, and a
// post never belongs to a token.
export function provenanceOf(
  actor: Extract<Actor, { kind: "member" | "agent" }>,
  now: Date,
  bodyMd: string,
): Pick<NewPost, "origin" | "agentTokenId" | "reviewedAt" | "agentDraftMd"> {
  return actor.kind === "agent"
    ? {
        origin: "agent",
        agentTokenId: actor.grant.tokenId,
        reviewedAt: null,
        agentDraftMd: bodyMd.trim() === "" ? null : bodyMd,
      }
    : { origin: "editor", agentTokenId: null, reviewedAt: now, agentDraftMd: null };
}

// An agent's first write to a post no agent wrote before keeps its text as the post's
// agent draft (D22). Every later write, the agent's or a person's, leaves it alone.
// A blank body is not a draft yet, so the first real text is the one kept.
export function agentDraftStamp(
  actor: Actor,
  current: Pick<Post, "agentDraftMd">,
  bodyMd: string | undefined,
): { agentDraftMd?: string } {
  return actor.kind === "agent" &&
    current.agentDraftMd === null &&
    bodyMd !== undefined &&
    bodyMd.trim() !== ""
    ? { agentDraftMd: bodyMd }
    : {};
}

// A save or a publish by a signed-in member marks the post reviewed (D22). An agent's
// own save never does, so the badge stays until a person opens the draft. An anonymous
// author never reaches here: their one write sets the stamp directly.
export function reviewStamp(actor: Actor, now: Date): { reviewedAt?: Date } {
  return actor.kind === "member" ? { reviewedAt: now } : {};
}

// An agent's change to a published post marks it until a person saves it (D32): the
// author's posts list and the disclosure footer read the mark. A person's save clears
// it. A draft never carries it, since nobody reads a draft but its author.
export function agentEditStamp(
  actor: Actor,
  current: Pick<Post, "status" | "agentEditedAt">,
  now: Date,
): { agentEditedAt?: Date | null } {
  if (actor.kind === "agent") {
    return current.status === "published" ? { agentEditedAt: now } : {};
  }
  return actor.kind === "member" && current.agentEditedAt !== null
    ? { agentEditedAt: null }
    : {};
}
