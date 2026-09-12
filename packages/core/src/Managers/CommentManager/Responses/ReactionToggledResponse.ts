import type { ReactionKind } from "../../../Common/ReactionKind";
import type { ReactionTarget } from "../../../Common/ReactionTarget";
import { ResponseBase } from "../../../Common/ResponseBase";

// `reacted` is the state after the toggle: true when the reaction was added, false when
// it was taken back.
export class ReactionToggledResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly target: ReactionTarget,
    readonly kind: ReactionKind,
    readonly reacted: boolean,
  ) {
    super(correlationId);
  }
}
