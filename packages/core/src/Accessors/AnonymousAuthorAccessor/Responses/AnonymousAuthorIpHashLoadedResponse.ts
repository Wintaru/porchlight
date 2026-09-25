import { ResponseBase } from "../../../Common/ResponseBase";

// Null for a row written before the hash was kept.
export class AnonymousAuthorIpHashLoadedResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly ipHash: string | null,
  ) {
    super(correlationId);
  }
}
