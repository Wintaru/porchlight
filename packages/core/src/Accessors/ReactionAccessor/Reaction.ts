import type { ReactionKind } from "../../Common/ReactionKind";
import type { ReactionTarget } from "../../Common/ReactionTarget";

// One member's reaction of one kind on one item: the `reactions_unique_per_member` key.
export interface Reaction {
  readonly target: ReactionTarget;
  readonly profileId: string;
  readonly kind: ReactionKind;
}
