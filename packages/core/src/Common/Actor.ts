import type { AgentGrant } from "./AgentGrant";
import type { Profile } from "./Profile";

// Who is asking. A visitor is anyone without a session; a member carries their profile so
// the PermissionEngine can read role, trust and status without another load; an agent
// (D22) is a member's own tool, holding a personal token: it carries that member's
// profile and the token's grant of scopes, and the PermissionEngine rules on it
// separately, so nothing a member may do is an agent's by accident. The Client
// resolves the actor once per request and pins it on every request it builds.
export type Actor =
  | { readonly kind: "visitor" }
  | { readonly kind: "member"; readonly profile: Profile }
  | { readonly kind: "agent"; readonly profile: Profile; readonly grant: AgentGrant };

export type AgentActor = Extract<Actor, { kind: "agent" }>;

export const VISITOR: Actor = { kind: "visitor" };
