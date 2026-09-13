import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";

// Every reaction one member left, on anything (issue #14's export bundle). Not for
// counts: those stay the read-model's job under RLS (D9).
export class LoadReactionsByProfileRequest extends RequestBase {
  constructor(
    readonly profileId: string,
    context?: RequestContext,
  ) {
    super(context);
  }
}
