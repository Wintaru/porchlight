import type { PostRevision } from "../../../Common/PostRevision";
import { ResponseBase } from "../../../Common/ResponseBase";

export class PostRevisionsLoadedResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly revisions: readonly PostRevision[],
  ) {
    super(correlationId);
  }
}
