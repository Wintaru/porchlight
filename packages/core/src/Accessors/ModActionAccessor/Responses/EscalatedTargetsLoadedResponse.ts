import { ResponseBase } from "../../../Common/ResponseBase";

// The ids, among the ones asked about, with at least one `escalate` action on record.
export class EscalatedTargetsLoadedResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly postIds: ReadonlySet<string>,
    readonly commentIds: ReadonlySet<string>,
  ) {
    super(correlationId);
  }
}
