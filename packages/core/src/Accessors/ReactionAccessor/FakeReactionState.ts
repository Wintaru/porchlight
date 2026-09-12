import type { Reaction } from "./Reaction";

// The fake's `reactions` table, keyed the way the per-member unique constraint is.
// `failing` makes every call answer ReactionAccessFailedResponse, for the error path.
export class FakeReactionState {
  readonly reactions = new Set<string>();

  constructor(readonly failing = false) {}

  static keyOf(reaction: Reaction): string {
    return `${reaction.target.kind}:${reaction.target.id}:${reaction.profileId}:${reaction.kind}`;
  }
}
