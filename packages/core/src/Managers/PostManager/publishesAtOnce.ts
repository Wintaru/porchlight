import type { Actor } from "../../Common/Actor";

// Whether this actor's publish goes up at once or waits for a moderator. Trust decides
// (SPEC.md §4), and staff are trusted by definition. An agent carries its member's
// trust unchanged (SPEC.md §17): a probation member's agent lands in `pending`, exactly
// as the member would. Exported through the core entry so the MCP door can tell a
// connecting agent where its post will go, instead of restating the rule.
export function publishesAtOnce(actor: Actor): boolean {
  return (
    actor.kind !== "visitor" &&
    (actor.profile.trustLevel === "trusted" || actor.profile.role !== "member")
  );
}
