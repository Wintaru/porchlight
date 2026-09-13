import { ResponseBase } from "../../../Common/ResponseBase";
import type { Reaction } from "../Reaction";

export class ReactionsLoadedResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly reactions: readonly Reaction[],
  ) {
    super(correlationId);
  }
}
