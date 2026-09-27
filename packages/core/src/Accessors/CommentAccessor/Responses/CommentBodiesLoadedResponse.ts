import { ResponseBase } from "../../../Common/ResponseBase";
import type { StoredBody } from "../../../Common/StoredBody";

export class CommentBodiesLoadedResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly bodies: readonly StoredBody[],
  ) {
    super(correlationId);
  }
}
