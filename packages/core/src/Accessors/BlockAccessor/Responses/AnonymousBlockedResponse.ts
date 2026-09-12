import { ResponseBase } from "../../../Common/ResponseBase";

// A block matched. `reason` is the moderator's note, for the log only: it never
// reaches the visitor (SPEC.md §7, a denial never says what a moderator saw).
export class AnonymousBlockedResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly reason: string | null,
  ) {
    super(correlationId);
  }
}
