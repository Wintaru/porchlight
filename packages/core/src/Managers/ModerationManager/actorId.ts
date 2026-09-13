import type { Actor } from "../../Common/Actor";

// Every handler here calls `permit` before this, so a visitor never reaches it in
// practice; this narrows the type for mod_actions.actor_id, which is never null.
export function actorId(actor: Actor): string {
  if (actor.kind !== "member") {
    throw new Error("moderation permission granted to a visitor");
  }
  return actor.profile.id;
}
