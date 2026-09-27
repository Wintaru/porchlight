import { ResponseBase } from "../../../Common/ResponseBase";
import type { StoredBody } from "../../../Common/StoredBody";

export class PostBodiesLoadedResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly bodies: readonly StoredBody[],
  ) {
    super(correlationId);
  }
}
