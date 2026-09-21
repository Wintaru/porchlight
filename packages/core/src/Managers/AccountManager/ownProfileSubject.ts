import type { Actor } from "../../Common/Actor";
import type { PermissionSubject } from "../../Engines/PermissionEngine/PermissionSubject";

// The subject for a member's own-account actions (`token.manage`): their profile. A
// visitor has none, and the empty id makes `permit` answer `signed-out` before the id
// is ever read. An agent carries a profile, but the engine denies it the action anyway.
export function ownProfileSubject(actor: Actor): PermissionSubject {
  return { kind: "profile", id: actor.kind === "visitor" ? "" : actor.profile.id };
}
