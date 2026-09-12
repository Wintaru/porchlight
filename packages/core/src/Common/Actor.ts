import type { Profile } from "./Profile";

// Who is asking. A visitor is anyone without a session; a member carries their profile so
// the PermissionEngine can read role, trust and status without another load. The Client
// resolves the actor once per request and pins it on every request it builds.
export type Actor =
  { readonly kind: "visitor" } | { readonly kind: "member"; readonly profile: Profile };

export const VISITOR: Actor = { kind: "visitor" };
