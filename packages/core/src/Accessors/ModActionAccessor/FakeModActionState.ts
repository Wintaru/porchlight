import type { ModActionKind } from "../../Common/ModActionKind";
import type { ModActionTarget } from "../../Common/ModActionTarget";

export interface FakeModAction {
  readonly id: string;
  readonly actorId: string;
  readonly action: ModActionKind;
  readonly target: ModActionTarget;
  readonly reason: string | null;
  readonly createdAt: Date;
}

// The fake's `mod_actions` table, in insertion order. `failing` makes every call answer
// ModActionAccessFailedResponse, for the error path.
export class FakeModActionState {
  readonly actions: FakeModAction[] = [];

  constructor(readonly failing = false) {}
}
