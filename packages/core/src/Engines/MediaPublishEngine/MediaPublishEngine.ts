import type { HandlerResolver } from "../../Common/HandlerResolver";
import type { RequestBase } from "../../Common/RequestBase";
import type { ResponseBase } from "../../Common/ResponseBase";
import type { IMediaPublishEngine } from "./IMediaPublishEngine";

// Thin shell: one resolver for the one intent method. The work lives in Handlers/.
export class MediaPublishEngine implements IMediaPublishEngine {
  constructor(private readonly transformResolver: HandlerResolver) {}

  transform(request: RequestBase): Promise<ResponseBase> {
    return this.transformResolver.resolve(request);
  }
}
