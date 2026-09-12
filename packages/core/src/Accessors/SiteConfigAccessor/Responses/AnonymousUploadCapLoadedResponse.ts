import type { AnonymousUploadCap } from "../../../Common/AnonymousUploadCap";
import { ResponseBase } from "../../../Common/ResponseBase";

export class AnonymousUploadCapLoadedResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly cap: AnonymousUploadCap,
  ) {
    super(correlationId);
  }
}
