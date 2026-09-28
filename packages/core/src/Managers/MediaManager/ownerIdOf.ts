import type { Actor } from "../../Common/Actor";

// The member whose uploads a prune may touch: a member's own, or the member an agent
// writes for (#90). A visitor owns none.
export function ownerIdOf(actor: Actor): string | undefined {
  return actor.kind === "visitor" ? undefined : actor.profile.id;
}
