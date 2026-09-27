import { ResponseBase } from "../../../Common/ResponseBase";

// `keptIds` are unused uploads the prune could not delete: one still retained, or one
// whose delete failed. They stay, and the next prune tries again.
export class MediaPrunedResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly deletedIds: readonly string[],
    readonly keptIds: readonly string[],
  ) {
    super(correlationId);
  }
}
